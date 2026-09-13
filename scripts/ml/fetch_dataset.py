#!/usr/bin/env python3
"""
Orquestrador CLI de Coleta e Filtragem de Dados Inerciais (Gymbeat)
Suporta conexão com Firebase Firestore e fallback local para SQLite/JSON.
"""

import argparse
import json
import os
import re
import sqlite3
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
OUTPUT_DIR = Path(__file__).resolve().parent / "output"
DEFAULT_OUTPUT = OUTPUT_DIR / "dataset.json"


def load_env_vars() -> Dict[str, str]:
    """Carrega variáveis do arquivo .env da raiz do projeto sem depender de python-dotenv."""
    env_path = PROJECT_ROOT / ".env"
    env_vars = {}
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            env_vars[key.strip()] = val.strip().strip("'\"")
    return env_vars


def normalize_sex(sex_input: Optional[str]) -> Optional[str]:
    """Normaliza entrada de sexo para 'homem' ou 'mulher'."""
    if not sex_input:
        return None
    val = sex_input.strip().lower()
    if val in ("h", "homem", "m", "masculino", "male"):
        return "homem"
    if val in ("f", "mulher", "feminino", "female"):
        return "mulher"
    return val


def normalize_experience(exp_input: Optional[str]) -> Optional[str]:
    """Normaliza entrada de experiência de treino para 'iniciante', 'intermediario', 'experiente'."""
    if not exp_input:
        return None
    val = exp_input.strip().lower()
    if val in ("i", "iniciante", "beg", "beginner"):
        return "iniciante"
    if val in ("int", "intermediario", "intermediário", "intermediate"):
        return "intermediario"
    if val in ("e", "exp", "experiente", "avancado", "avançado", "advanced"):
        return "experiente"
    return val


def find_simulator_sqlite() -> Optional[Path]:
    """Tenta localizar o banco SQLite do app no CoreSimulator do macOS."""
    sim_dir = Path.home() / "Library/Developer/CoreSimulator/Devices"
    if not sim_dir.exists():
        return None
    for path in sim_dir.rglob("wearable-workout.db"):
        if path.is_file():
            return path
    return None


def fetch_from_sqlite(db_path: Path) -> List[Dict[str, Any]]:
    """Extrai perfis e sessões do banco SQLite local."""
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Mapear perfis por ID
    profiles: Dict[str, Dict[str, Any]] = {}
    cursor.execute("SELECT id, name, email, age, sex, training_experience FROM user_profile")
    for row in cursor.fetchall():
        profiles[row["id"]] = {
            "userId": row["id"],
            "userName": row["name"],
            "userEmail": row["email"],
            "userAge": row["age"],
            "userSex": row["sex"],
            "userExperience": row["training_experience"],
        }

    # Pegar todas as sessões
    sessions = []
    cursor.execute(
        """
        SELECT session_id, exercise_id, exercise_name, started_at, ended_at, set_count, reps
        FROM live_exercise_sessions
        ORDER BY started_at DESC
        """
    )
    session_rows = cursor.fetchall()

    for s_row in session_rows:
        session_id = s_row["session_id"]
        cursor.execute(
            """
            SELECT timestamp, acceleration_x, acceleration_y, acceleration_z,
                   gyroscope_x, gyroscope_y, gyroscope_z, heart_rate,
                   active_energy_burned, distance, step_count, oxygen_saturation
            FROM live_exercise_samples
            WHERE session_id = ?
            ORDER BY timestamp ASC
            """,
            (session_id,),
        )
        samples = []
        for smp in cursor.fetchall():
            samples.append({
                "timestamp": smp["timestamp"],
                "accelerationX": smp["acceleration_x"],
                "accelerationY": smp["acceleration_y"],
                "accelerationZ": smp["acceleration_z"],
                "gyroscopeX": smp["gyroscope_x"],
                "gyroscopeY": smp["gyroscope_y"],
                "gyroscopeZ": smp["gyroscope_z"],
                "heartRate": smp["heart_rate"],
                "activeEnergyBurned": smp["active_energy_burned"],
                "oxygenSaturation": smp["oxygen_saturation"],
            })

        default_profile = list(profiles.values())[0] if profiles else {
            "userId": "local-user",
            "userName": "Usuário Local",
            "userEmail": "local@gymbeat.app",
            "userAge": 25,
            "userSex": "homem",
            "userExperience": "iniciante",
        }

        sessions.append({
            **default_profile,
            "sessionId": s_row["session_id"],
            "exerciseId": s_row["exercise_id"],
            "exerciseName": s_row["exercise_name"],
            "startedAt": s_row["started_at"],
            "endedAt": s_row["ended_at"],
            "setCount": s_row["set_count"],
            "reps": s_row["reps"],
            "sampleCount": len(samples),
            "samples": samples,
            "source": "sqlite_local",
        })

    conn.close()
    return sessions


def fetch_from_firebase_rest(
    project_id: str, id_token: Optional[str] = None, current_uid: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Consulta o Firestore via REST API autenticado."""
    base_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents"
    headers = {"Content-Type": "application/json"}
    if id_token:
        headers["Authorization"] = f"Bearer {id_token}"

    user_docs = []
    # 1. Tentar listar todos os usuários
    try:
        req = urllib.request.Request(f"{base_url}/users", headers=headers)
        with urllib.request.urlopen(req) as resp:
            users_data = json.loads(resp.read().decode())
            user_docs = users_data.get("documents", [])
    except urllib.error.HTTPError as e:
        # Se 403 (permissão restrita a nível de usuário) e temos o UID do usuário autenticado:
        if e.code == 403 and current_uid:
            try:
                user_req = urllib.request.Request(f"{base_url}/users/{current_uid}", headers=headers)
                with urllib.request.urlopen(user_req) as u_resp:
                    user_doc = json.loads(u_resp.read().decode())
                    user_docs = [user_doc]
            except Exception as inner_e:
                raise RuntimeError(f"Falha ao consultar usuário {current_uid} no Firestore: {inner_e}")
        else:
            raise

    sessions: List[Dict[str, Any]] = []

    for u_doc in user_docs:
        u_fields = u_doc.get("fields", {})
        u_name_path = u_doc.get("name", "")
        uid = u_name_path.split("/")[-1]

        user_info = {
            "userId": uid,
            "userName": u_fields.get("name", {}).get("stringValue", "Sem Nome"),
            "userEmail": u_fields.get("email", {}).get("stringValue", ""),
            "userAge": int(u_fields.get("age", {}).get("integerValue", 0)),
            "userSex": u_fields.get("sex", {}).get("stringValue", ""),
            "userExperience": u_fields.get("trainingExperience", {}).get("stringValue", "iniciante"),
        }

        # Buscar subcoleção exerciseSessions
        sess_req = urllib.request.Request(f"{base_url}/users/{uid}/exerciseSessions", headers=headers)
        try:
            with urllib.request.urlopen(sess_req) as s_resp:
                sess_data = json.loads(s_resp.read().decode())
                for s_doc in sess_data.get("documents", []):
                    s_fields = s_doc.get("fields", {})
                    raw_samples = s_fields.get("samples", {}).get("arrayValue", {}).get("values", [])
                    samples = []
                    for raw in raw_samples:
                        m = raw.get("mapValue", {}).get("fields", {})
                        
                        def parse_num(fld: str) -> Optional[float]:
                            val_obj = m.get(fld, {})
                            if "doubleValue" in val_obj:
                                return float(val_obj["doubleValue"])
                            if "integerValue" in val_obj:
                                return float(val_obj["integerValue"])
                            return None

                        samples.append({
                            "timestamp": m.get("timestamp", {}).get("stringValue", ""),
                            "accelerationX": parse_num("accelerationX"),
                            "accelerationY": parse_num("accelerationY"),
                            "accelerationZ": parse_num("accelerationZ"),
                            "gyroscopeX": parse_num("gyroscopeX"),
                            "gyroscopeY": parse_num("gyroscopeY"),
                            "gyroscopeZ": parse_num("gyroscopeZ"),
                            "heartRate": parse_num("heartRate"),
                            "activeEnergyBurned": parse_num("activeEnergyBurned"),
                            "oxygenSaturation": parse_num("oxygenSaturation"),
                        })

                    sessions.append({
                        **user_info,
                        "sessionId": s_fields.get("sessionId", {}).get("stringValue", ""),
                        "exerciseId": s_fields.get("exerciseId", {}).get("stringValue", ""),
                        "exerciseName": s_fields.get("exerciseName", {}).get("stringValue", ""),
                        "startedAt": s_fields.get("startedAt", {}).get("stringValue", ""),
                        "endedAt": s_fields.get("endedAt", {}).get("stringValue", ""),
                        "reps": int(s_fields.get("reps", {}).get("integerValue", 0)),
                        "sampleCount": len(samples),
                        "samples": samples,
                        "source": "firebase_firestore",
                    })
        except urllib.error.HTTPError as e:
            if e.code != 404:
                print(f"[Aviso] Falha ao ler sessões do usuário {uid}: {e}", file=sys.stderr)

    return sessions


def authenticate_firebase(api_key: str, email: str, password: str) -> Tuple[Optional[str], Optional[str]]:
    """Obtém (idToken, localId) via Firebase Auth REST API."""
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"
    payload = json.dumps({"email": email, "password": password, "returnSecureToken": True}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            return data.get("idToken"), data.get("localId")
    except Exception as e:
        print(f"[Erro] Falha na autenticação Firebase Auth: {e}", file=sys.stderr)
        return None, None


def fetch_dataset(
    age_range: Optional[List[int]] = None,
    emails: Optional[List[str]] = None,
    sex: Optional[str] = None,
    experience: Optional[str] = None,
    source: str = "auto",
    sqlite_path: Optional[str] = None,
    service_account: Optional[str] = None,
    auth_email: Optional[str] = None,
    auth_password: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Função principal que busca dados e aplica os filtros especificados.
    Pode ser importada por outros scripts Python.
    """
    env_vars = load_env_vars()
    project_id = env_vars.get("EXPO_PUBLIC_FIREBASE_PROJECT_ID", "tcc-datacollection")
    api_key = env_vars.get("EXPO_PUBLIC_FIREBASE_API_KEY", "")

    all_sessions: List[Dict[str, Any]] = []

    # 1. Tentar Firebase se solicitado ou no modo auto
    if source in ("firebase", "auto"):
        token = None
        current_uid = None
        user_email = auth_email or env_vars.get("FIREBASE_AUTH_EMAIL")
        user_pass = auth_password or env_vars.get("FIREBASE_AUTH_PASSWORD")

        if api_key and user_email and user_pass:
            token, current_uid = authenticate_firebase(api_key, user_email, user_pass)

        try:
            print(f"[*] Conectando ao Firebase Firestore ({project_id})...")
            all_sessions = fetch_from_firebase_rest(project_id, token, current_uid=current_uid)
            print(f"[+] Firebase: {len(all_sessions)} sessões recuperadas.")
        except Exception as e:
            if source == "firebase":
                raise RuntimeError(f"Erro na conexão com Firebase: {e}")
            print(f"[!] Firebase indisponível ou requer autenticação ({e}). Tentando base local...")

    # 2. Fallback para SQLite local
    if not all_sessions and source in ("local", "auto"):
        target_db = Path(sqlite_path) if sqlite_path else find_simulator_sqlite()
        if target_db and target_db.exists():
            print(f"[*] Carregando base local do SQLite: {target_db.name}...")
            all_sessions = fetch_from_sqlite(target_db)
            print(f"[+] SQLite: {len(all_sessions)} sessões recuperadas.")
        else:
            if source == "local":
                raise FileNotFoundError("Banco SQLite local não encontrado.")

    # 3. Aplicar Filtros
    filtered_sessions = []
    norm_sex = normalize_sex(sex)
    norm_exp = normalize_experience(experience)
    email_set = {e.strip().lower() for e in emails} if emails else None

    for s in all_sessions:
        # Filtro de Idade
        if age_range:
            min_age, max_age = sorted(age_range[:2])
            age = s.get("userAge")
            if age is None or age < min_age or age > max_age:
                continue

        # Filtro de Email (Stackable)
        if email_set is not None:
            user_email = s.get("userEmail", "").strip().lower()
            if user_email not in email_set:
                continue

        # Filtro de Sexo
        if norm_sex:
            user_sex = normalize_sex(s.get("userSex"))
            if user_sex != norm_sex:
                continue

        # Filtro de Experiência
        if norm_exp:
            user_exp = normalize_experience(s.get("userExperience"))
            if user_exp != norm_exp:
                continue

        filtered_sessions.append(s)

    return filtered_sessions


def main():
    parser = argparse.ArgumentParser(
        description="Orquestrador CLI de Coleta e Filtragem de Dados Inerciais (Gymbeat)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    # Flags solicitadas
    parser.add_argument(
        "--user-age-range",
        "--user-age-rage",
        nargs=2,
        type=int,
        metavar=("MIN", "MAX"),
        help="Filtra por faixa etária (ex: --user-age-range 18 30)",
    )
    parser.add_argument(
        "--user-email",
        action="append",
        dest="user_emails",
        metavar="EMAIL",
        help="Filtra por e-mail (acumulável: pode ser passado múltiplas vezes)",
    )
    parser.add_argument(
        "--user-sex",
        metavar="SEX",
        help="Filtra por sexo: 'h'/'homem' ou 'm'/'mulher'",
    )
    parser.add_argument(
        "--user-experience",
        metavar="EXP",
        help="Filtra por experiência: 'iniciante'/'i', 'intermediario'/'int', 'experiente'/'e'",
    )

    # Configurações de Conexão e Saída
    parser.add_argument(
        "--source",
        choices=["auto", "firebase", "local"],
        default="auto",
        help="Fonte de dados: 'auto' (tenta Firebase e cai para SQLite), 'firebase' ou 'local'",
    )
    parser.add_argument("--sqlite-path", help="Caminho explícito para arquivo .db SQLite local")
    parser.add_argument("--auth-email", help="E-mail de autenticação Firebase Auth (opcional)")
    parser.add_argument("--auth-password", help="Senha de autenticação Firebase Auth (opcional)")
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT),
        help=f"Caminho do arquivo JSON de saída (padrão: {DEFAULT_OUTPUT})",
    )

    args = parser.parse_args()

    sessions = fetch_dataset(
        age_range=args.user_age_range,
        emails=args.user_emails,
        sex=args.user_sex,
        experience=args.user_experience,
        source=args.source,
        sqlite_path=args.sqlite_path,
        auth_email=args.auth_email,
        auth_password=args.auth_password,
    )

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(sessions, f, indent=2, ensure_ascii=False)

    print(f"\n==========================================")
    print(f"📊 RESUMO DA COLETA / FILTRAGEM (Gymbeat)")
    print(f"==========================================")
    print(f"Total de sessões filtradas: {len(sessions)}")
    if sessions:
        total_samples = sum(s.get("sampleCount", 0) for s in sessions)
        exercises = set(s.get("exerciseName", "N/D") for s in sessions)
        users = set(s.get("userEmail", "N/D") for s in sessions)
        print(f"Total de amostras: {total_samples}")
        print(f"Exercícios encontrados: {', '.join(exercises)}")
        print(f"Usuários encontrados: {', '.join(users)}")
    print(f"Arquivo salvo em: {output_path.resolve()}")
    print(f"==========================================\n")


if __name__ == "__main__":
    main()
