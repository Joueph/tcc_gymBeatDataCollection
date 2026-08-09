const fs = require("fs");
const path = require("path");
const {
  withDangerousMod,
  withXcodeProject,
} = require("@expo/config-plugins");

const WATCH_TARGET_NAME = "WearableWorkoutWatch Watch App";
const WATCH_DISPLAY_NAME = "WearableWorkoutWatch";
const WATCH_BUNDLE_IDENTIFIER = "com.joueph.wearableworkout.watchkitapp";
const WATCH_COMPANION_BUNDLE_IDENTIFIER = "com.joueph.wearableworkout";
const WATCH_SOURCE_DIR = "native/watch-app";
const WATCH_DEST_DIR = WATCH_TARGET_NAME;
const WATCH_PLIST_NAME = "WearableWorkoutWatch-Watch-App-Info.plist";
const WATCH_ENTITLEMENTS_NAME = `${WATCH_TARGET_NAME}.entitlements`;

const swiftFiles = [
  "ContentView.swift",
  "MetricSample.swift",
  "WatchMessage.swift",
  "WatchSessionManager.swift",
  "WatchWorkoutState.swift",
  "WearableWorkoutWatchApp.swift",
  "WorkoutManager.swift",
  "WorkoutStatusView.swift",
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyWatchSources(projectRoot, iosRoot) {
  const sourceRoot = path.join(projectRoot, WATCH_SOURCE_DIR);
  const destRoot = path.join(iosRoot, WATCH_DEST_DIR);

  ensureDir(destRoot);

  for (const fileName of swiftFiles) {
    fs.copyFileSync(path.join(sourceRoot, fileName), path.join(destRoot, fileName));
  }

  fs.writeFileSync(
    path.join(destRoot, WATCH_ENTITLEMENTS_NAME),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>com.apple.developer.healthkit</key>
\t<true/>
\t<key>com.apple.developer.healthkit.background-delivery</key>
\t<true/>
</dict>
</plist>
`
  );

  fs.writeFileSync(
    path.join(iosRoot, WATCH_PLIST_NAME),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>CFBundleDevelopmentRegion</key>
\t<string>$(DEVELOPMENT_LANGUAGE)</string>
\t<key>CFBundleDisplayName</key>
\t<string>${WATCH_DISPLAY_NAME}</string>
\t<key>CFBundleExecutable</key>
\t<string>$(EXECUTABLE_NAME)</string>
\t<key>CFBundleIdentifier</key>
\t<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
\t<key>CFBundleInfoDictionaryVersion</key>
\t<string>6.0</string>
\t<key>CFBundleName</key>
\t<string>$(PRODUCT_NAME)</string>
\t<key>CFBundlePackageType</key>
\t<string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
\t<key>CFBundleShortVersionString</key>
\t<string>$(MARKETING_VERSION)</string>
\t<key>CFBundleVersion</key>
\t<string>$(CURRENT_PROJECT_VERSION)</string>
\t<key>NSHealthShareUsageDescription</key>
\t<string>O Wearable Workout usa dados de saude do Apple Watch para acompanhar metricas do treino em andamento.</string>
\t<key>NSHealthUpdateUsageDescription</key>
\t<string>O Wearable Workout salva treinos iniciados no Apple Watch para registrar metricas do exercicio.</string>
\t<key>UIBackgroundModes</key>
\t<array/>
\t<key>WKBackgroundModes</key>
\t<array>
\t\t<string>workout-processing</string>
\t</array>
\t<key>WKApplication</key>
\t<true/>
\t<key>WKCompanionAppBundleIdentifier</key>
\t<string>${WATCH_COMPANION_BUNDLE_IDENTIFIER}</string>
\t<key>WKRunsIndependentlyOfCompanionApp</key>
\t<true/>
</dict>
</plist>
`
  );
}

function hasTarget(project) {
  return Boolean(project.pbxTargetByName(WATCH_TARGET_NAME));
}

function getQuoted(value) {
  return `"${value}"`;
}

function addBuildConfiguration(project, name, settings) {
  const uuid = project.generateUuid();
  const section = project.pbxXCBuildConfigurationSection();
  section[uuid] = {
    isa: "XCBuildConfiguration",
    buildSettings: settings,
    name,
  };
  section[`${uuid}_comment`] = name;
  return uuid;
}

function addConfigurationList(project, debugUuid, releaseUuid) {
  const uuid = project.generateUuid();
  const section = project.pbxXCConfigurationList();
  section[uuid] = {
    isa: "XCConfigurationList",
    buildConfigurations: [
      { value: debugUuid, comment: "Debug" },
      { value: releaseUuid, comment: "Release" },
    ],
    defaultConfigurationIsVisible: 0,
    defaultConfigurationName: "Release",
  };
  section[`${uuid}_comment`] = `Build configuration list for PBXNativeTarget "${WATCH_TARGET_NAME}"`;
  return uuid;
}

function addBuildPhase(project, sectionName, comment, extra = {}) {
  const uuid = project.generateUuid();
  project.hash.project.objects[sectionName] ||= {};
  project.hash.project.objects[sectionName][uuid] = {
    isa: sectionName,
    buildActionMask: 2147483647,
    files: [],
    runOnlyForDeploymentPostprocessing: 0,
    ...extra,
  };
  project.hash.project.objects[sectionName][`${uuid}_comment`] = comment;
  return uuid;
}

function addWatchTarget(project, config) {
  if (hasTarget(project)) {
    return;
  }

  const appBundleIdentifier = config.ios?.bundleIdentifier;
  if (!appBundleIdentifier) {
    throw new Error("ios.bundleIdentifier is required before adding the Watch app target.");
  }

  const targetUuid = project.generateUuid();
  const productUuid = project.generateUuid();
  const groupUuid = project.generateUuid();
  const buildFileUuid = project.generateUuid();
  const proxyUuid = project.generateUuid();
  const dependencyUuid = project.generateUuid();

  const sourcesUuid = addBuildPhase(project, "PBXSourcesBuildPhase", "Sources");
  const frameworksUuid = addBuildPhase(project, "PBXFrameworksBuildPhase", "Frameworks");
  const resourcesUuid = addBuildPhase(project, "PBXResourcesBuildPhase", "Resources");

  const sharedBuildSettings = {
    ARCHS: getQuoted("$(ARCHS_STANDARD_32_BIT)"),
    ASSETCATALOG_COMPILER_APPICON_NAME: "AppIcon",
    ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS: "YES",
    ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: "AccentColor",
    ASSETCATALOG_COMPILER_INCLUDE_ALL_APPICON_ASSETS: "YES",
    CLANG_ANALYZER_NONNULL: "YES",
    CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION: "YES_AGGRESSIVE",
    CLANG_CXX_LANGUAGE_STANDARD: getQuoted("gnu++20"),
    CLANG_ENABLE_OBJC_WEAK: "YES",
    CLANG_WARN_DOCUMENTATION_COMMENTS: "YES",
    CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER: "YES",
    CLANG_WARN_UNGUARDED_AVAILABILITY: "YES_AGGRESSIVE",
    CODE_SIGN_ENTITLEMENTS: getQuoted(`${WATCH_DEST_DIR}/${WATCH_ENTITLEMENTS_NAME}`),
    CODE_SIGN_IDENTITY: getQuoted("Apple Development"),
    CODE_SIGN_STYLE: "Automatic",
    CURRENT_PROJECT_VERSION: config.ios?.buildNumber || "1",
    ENABLE_PREVIEWS: "YES",
    ENABLE_USER_SCRIPT_SANDBOXING: "YES",
    GCC_C_LANGUAGE_STANDARD: "gnu17",
    GENERATE_INFOPLIST_FILE: "NO",
    INFOPLIST_FILE: getQuoted(WATCH_PLIST_NAME),
    INFOPLIST_KEY_CFBundleDisplayName: WATCH_DISPLAY_NAME,
    INFOPLIST_KEY_UISupportedInterfaceOrientations:
      getQuoted("UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown"),
    INFOPLIST_KEY_WKCompanionAppBundleIdentifier: appBundleIdentifier,
    INFOPLIST_KEY_WKRunsIndependentlyOfCompanionApp: "YES",
    LD_RUNPATH_SEARCH_PATHS: [getQuoted("$(inherited)"), getQuoted("@executable_path/Frameworks")],
    LOCALIZATION_PREFERS_STRING_CATALOGS: "YES",
    MARKETING_VERSION: config.version || "1.0",
    MTL_FAST_MATH: "YES",
    PRODUCT_BUNDLE_IDENTIFIER: WATCH_BUNDLE_IDENTIFIER,
    PRODUCT_NAME: getQuoted("$(TARGET_NAME)"),
    PROVISIONING_PROFILE_SPECIFIER: getQuoted(""),
    SDKROOT: "watchos",
    SKIP_INSTALL: "NO",
    STRING_CATALOG_GENERATE_SYMBOLS: "YES",
    SWIFT_APPROACHABLE_CONCURRENCY: "YES",
    SWIFT_DEFAULT_ACTOR_ISOLATION: "MainActor",
    SWIFT_EMIT_LOC_STRINGS: "YES",
    SWIFT_UPCOMING_FEATURE_MEMBER_IMPORT_VISIBILITY: "YES",
    SWIFT_VERSION: "5.0",
    TARGETED_DEVICE_FAMILY: getQuoted("4"),
    "TARGETED_DEVICE_FAMILY[sdk=watchos*]": getQuoted("4"),
    WATCHOS_DEPLOYMENT_TARGET: "8.0",
  };

  const debugUuid = addBuildConfiguration(project, "Debug", {
    ...sharedBuildSettings,
    DEBUG_INFORMATION_FORMAT: "dwarf",
    MTL_ENABLE_DEBUG_INFO: "INCLUDE_SOURCE",
    OTHER_SWIFT_FLAGS: getQuoted("$(inherited) -D EXPO_CONFIGURATION_DEBUG"),
    SWIFT_ACTIVE_COMPILATION_CONDITIONS: getQuoted("DEBUG $(inherited)"),
    SWIFT_OPTIMIZATION_LEVEL: getQuoted("-Onone"),
  });

  const releaseUuid = addBuildConfiguration(project, "Release", {
    ...sharedBuildSettings,
    COPY_PHASE_STRIP: "NO",
    DEBUG_INFORMATION_FORMAT: getQuoted("dwarf-with-dsym"),
    MTL_ENABLE_DEBUG_INFO: "NO",
    OTHER_SWIFT_FLAGS: getQuoted("$(inherited) -D EXPO_CONFIGURATION_RELEASE"),
    SWIFT_COMPILATION_MODE: "wholemodule",
    VALIDATE_PRODUCT: "YES",
  });

  const configurationListUuid = addConfigurationList(project, debugUuid, releaseUuid);

  project.pbxFileReferenceSection()[productUuid] = {
    isa: "PBXFileReference",
    explicitFileType: "wrapper.application",
    includeInIndex: 0,
    path: getQuoted(`${WATCH_TARGET_NAME}.app`),
    sourceTree: "BUILT_PRODUCTS_DIR",
  };
  project.pbxFileReferenceSection()[`${productUuid}_comment`] = `${WATCH_TARGET_NAME}.app`;

  project.hash.project.objects.PBXFileSystemSynchronizedRootGroup ||= {};
  project.hash.project.objects.PBXFileSystemSynchronizedRootGroup[groupUuid] = {
    isa: "PBXFileSystemSynchronizedRootGroup",
    exceptions: [],
    explicitFileTypes: {},
    explicitFolders: [],
    path: getQuoted(WATCH_DEST_DIR),
    sourceTree: getQuoted("<group>"),
  };
  project.hash.project.objects.PBXFileSystemSynchronizedRootGroup[`${groupUuid}_comment`] =
    WATCH_TARGET_NAME;

  project.pbxNativeTargetSection()[targetUuid] = {
    isa: "PBXNativeTarget",
    buildConfigurationList: configurationListUuid,
    buildConfigurationList_comment: `Build configuration list for PBXNativeTarget "${WATCH_TARGET_NAME}"`,
    buildPhases: [
      { value: sourcesUuid, comment: "Sources" },
      { value: frameworksUuid, comment: "Frameworks" },
      { value: resourcesUuid, comment: "Resources" },
    ],
    buildRules: [],
    dependencies: [],
    fileSystemSynchronizedGroups: [{ value: groupUuid, comment: WATCH_TARGET_NAME }],
    name: getQuoted(WATCH_TARGET_NAME),
    productName: getQuoted(WATCH_TARGET_NAME),
    productReference: productUuid,
    productReference_comment: `${WATCH_TARGET_NAME}.app`,
    productType: getQuoted("com.apple.product-type.application"),
  };
  project.pbxNativeTargetSection()[`${targetUuid}_comment`] = WATCH_TARGET_NAME;

  project.hash.project.objects.PBXBuildFile ||= {};
  project.hash.project.objects.PBXBuildFile[buildFileUuid] = {
    isa: "PBXBuildFile",
    fileRef: productUuid,
    fileRef_comment: `${WATCH_TARGET_NAME}.app`,
    settings: { ATTRIBUTES: ["RemoveHeadersOnCopy"] },
  };
  project.hash.project.objects.PBXBuildFile[`${buildFileUuid}_comment`] =
    `${WATCH_TARGET_NAME}.app in Embed Watch Content`;

  const embedPhaseUuid = addBuildPhase(project, "PBXCopyFilesBuildPhase", "Embed Watch Content", {
    dstPath: getQuoted("$(CONTENTS_FOLDER_PATH)/Watch"),
    dstSubfolderSpec: 16,
    files: [{ value: buildFileUuid, comment: `${WATCH_TARGET_NAME}.app in Embed Watch Content` }],
    name: getQuoted("Embed Watch Content"),
  });

  const firstTarget = project.getFirstTarget();
  const firstNativeTarget = project.pbxNativeTargetSection()[firstTarget.uuid];
  firstNativeTarget.buildPhases.push({ value: embedPhaseUuid, comment: "Embed Watch Content" });
  firstNativeTarget.dependencies.push({ value: dependencyUuid, comment: "PBXTargetDependency" });

  project.hash.project.objects.PBXContainerItemProxy ||= {};
  project.hash.project.objects.PBXContainerItemProxy[proxyUuid] = {
    isa: "PBXContainerItemProxy",
    containerPortal: project.getFirstProject().uuid,
    containerPortal_comment: "Project object",
    proxyType: 1,
    remoteGlobalIDString: targetUuid,
    remoteInfo: getQuoted(WATCH_TARGET_NAME),
  };
  project.hash.project.objects.PBXContainerItemProxy[`${proxyUuid}_comment`] =
    "PBXContainerItemProxy";

  project.hash.project.objects.PBXTargetDependency ||= {};
  project.hash.project.objects.PBXTargetDependency[dependencyUuid] = {
    isa: "PBXTargetDependency",
    target: targetUuid,
    target_comment: WATCH_TARGET_NAME,
    targetProxy: proxyUuid,
    targetProxy_comment: "PBXContainerItemProxy",
  };
  project.hash.project.objects.PBXTargetDependency[`${dependencyUuid}_comment`] =
    "PBXTargetDependency";

  const firstProject = project.getFirstProject().firstProject;
  firstProject.targets.push({ value: targetUuid, comment: WATCH_TARGET_NAME });
  firstProject.attributes.TargetAttributes[targetUuid] = {
    CreatedOnToolsVersion: "26.1.1",
  };

  const mainGroup = project.pbxGroupByName("MainGroup") || project.hash.project.objects.PBXGroup[firstProject.mainGroup];
  mainGroup.children.splice(2, 0, { value: groupUuid, comment: WATCH_TARGET_NAME });

  const productsGroup = project.hash.project.objects.PBXGroup[firstProject.productRefGroup];
  productsGroup.children.push({ value: productUuid, comment: `${WATCH_TARGET_NAME}.app` });
}

function withWatchApp(config) {
  config.extra ||= {};
  config.extra.eas ||= {};
  config.extra.eas.build ||= {};
  config.extra.eas.build.experimental ||= {};
  config.extra.eas.build.experimental.ios ||= {};
  config.extra.eas.build.experimental.ios.appExtensions ||= [];

  const appExtensions = config.extra.eas.build.experimental.ios.appExtensions;
  const existingExtension = appExtensions.find(
    (extension) => extension.targetName === WATCH_TARGET_NAME
  );
  if (existingExtension) {
    existingExtension.bundleIdentifier = WATCH_BUNDLE_IDENTIFIER;
    existingExtension.entitlements ||= {};
    existingExtension.entitlements["com.apple.developer.healthkit"] = true;
    existingExtension.entitlements["com.apple.developer.healthkit.background-delivery"] = true;
  } else {
    appExtensions.push({
      targetName: WATCH_TARGET_NAME,
      bundleIdentifier: WATCH_BUNDLE_IDENTIFIER,
      entitlements: {
        "com.apple.developer.healthkit": true,
        "com.apple.developer.healthkit.background-delivery": true,
      },
    });
  }

  config = withDangerousMod(config, [
    "ios",
    (config) => {
      copyWatchSources(config.modRequest.projectRoot, config.modRequest.platformProjectRoot);
      return config;
    },
  ]);

  return withXcodeProject(config, (config) => {
    addWatchTarget(config.modResults, config);
    return config;
  });
}

module.exports = withWatchApp;
