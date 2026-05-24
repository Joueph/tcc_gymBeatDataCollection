const { withEntitlementsPlist, withInfoPlist } = require("@expo/config-plugins");

const SHARE_MESSAGE =
  "O Wearable Workout usa dados do app Saude, sincronizados pelo Apple Watch, para mostrar metricas dos seus treinos.";

const withHealthKit = (config) => {
  config = withInfoPlist(config, (config) => {
    config.modResults.NSHealthShareUsageDescription =
      config.modResults.NSHealthShareUsageDescription || SHARE_MESSAGE;
    return config;
  });

  config = withEntitlementsPlist(config, (config) => {
    config.modResults["com.apple.developer.healthkit"] = true;
    return config;
  });

  return config;
};

module.exports = withHealthKit;
