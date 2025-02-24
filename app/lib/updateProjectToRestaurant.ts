import path from "path";
import { promises as fs } from "fs";
const projectPrefix = `bitesnbagsMainApp/`;

interface AppConfig {
  appName: string;
  apiRefId: string;
  pusherId: string;
  facebookId: string;
  applePayLabel: string;
  googlePayMerchant: string;
  environment: "staging" | "live";
  ios: { bundleId: string; buildNumber: string; buildVersion: string };
  android: { bundleId: string; buildNumber: string; buildVersion: string };
}

interface Restaurant {
  refId: string;
  name: string;
  config: AppConfig;
}

// Helper function to update file content with regex
const updateContent = async (
  filePath: string,
  regex: RegExp,
  newText: string
) => {
  try {
    let data = await fs.readFile(filePath, "utf8");
    // Ensure the regex has the global flag if not already present
    const globalRegex = regex.global
      ? regex
      : new RegExp(regex.source, regex.flags + "g");
    if (!globalRegex.test(data)) {
      throw new Error(`Pattern ${regex} not found in ${filePath}`);
    }
    const updatedContent = data.replace(globalRegex, newText);
    await fs.writeFile(filePath, updatedContent, "utf8");
    console.log(`\x1b[32mUpdated ${filePath}\x1b[0m`);
  } catch (err: any) {
    console.log(`\x1b[31mError updating ${filePath}: ${err.message}\x1b[0m`);
    throw err;
  }
};

// Helper function to copy a directory recursively
const copyDirectory = async (
  source: string,
  destination: string,
  overwrite: boolean = false
) => {
  try {
    if (!(await fs.stat(source).catch(() => null))) {
      throw new Error(`Source directory "${source}" does not exist!`);
    }

    if (!(await fs.stat(destination).catch(() => null))) {
      await fs.mkdir(destination, { recursive: true });
    }

    const files = await fs.readdir(source);

    for (const file of files) {
      const sourcePath = path.join(source, file);
      const destPath = path.join(destination, file);
      const stat = await fs.stat(sourcePath);

      if (stat.isDirectory()) {
        await copyDirectory(sourcePath, destPath, overwrite);
      } else if (!(await fs.stat(destPath).catch(() => null)) || overwrite) {
        await fs.copyFile(sourcePath, destPath);
        console.log(`\x1b[32mCopied ${sourcePath} to ${destPath}\x1b[0m`);
      } else {
        console.log(
          `\x1b[33mFile ${destPath} already exists, skipping...\x1b[0m`
        );
      }
    }
  } catch (err: any) {
    console.log(`\x1b[31mError copying directory: ${err.message}\x1b[0m`);
    throw err;
  }
};

const getApiUrl = (environment: "staging" | "live") => {
  return environment === "staging"
    ? "https://stg.bitesnbags.com"
    : "https://bitesnbags.com";
};

// Helper function to update iOS project.pbxproj with build number and version
const updateIOSProject = async (
  filePath: string,
  iosBundleId: string,
  newBuildNumber: string,
  newVersion: string
) => {
  try {
    let data = await fs.readFile(filePath, "utf8");
    // Match and replace PRODUCT_BUNDLE_IDENTIFIER
    const bundleIdRegex = /PRODUCT_BUNDLE_IDENTIFIER\s*=\s*".*?"/g;
    data = data.replace(
      bundleIdRegex,
      `PRODUCT_BUNDLE_IDENTIFIER = "${iosBundleId}"`
    );
    // Match and replace CURRENT_PROJECT_VERSION
    const buildNumberRegex = /CURRENT_PROJECT_VERSION\s*=\s*[^;]+;/g;
    data = data.replace(
      buildNumberRegex,
      `CURRENT_PROJECT_VERSION = ${newBuildNumber};`
    );
    // Match and replace MARKETING_VERSION
    const versionRegex = /MARKETING_VERSION\s*=\s*[^;]+;/g;
    data = data.replace(versionRegex, `MARKETING_VERSION = ${newVersion};`);

    await fs.writeFile(filePath, data, "utf8");
    console.log(`\x1b[32mUpdated iOS project settings in ${filePath}\x1b[0m`);
  } catch (err: any) {
    console.log(`\x1b[31mError updating ${filePath}: ${err.message}\x1b[0m`);
    throw err;
  }
};

// Helper function to update Android build.gradle with build number and version
const updateAndroidGradle = async (
  filePath: string,
  androidAppId: string,
  newBuildNumber: string,
  newVersion: string
) => {
  try {
    let data = await fs.readFile(filePath, "utf8");
    // Match and replace applicationId
    const bundleIdRegex = /applicationId\s+".*?"/s;
    data = data.replace(bundleIdRegex, `applicationId "${androidAppId}"`);
    // Match and replace versionCode
    const buildNumberRegex = /versionCode\s+\d+/s;
    data = data.replace(buildNumberRegex, `versionCode ${newBuildNumber}`);
    // Match and replace versionName
    const versionRegex = /versionName\s+".*?"/s;
    data = data.replace(versionRegex, `versionName "${newVersion}"`);

    await fs.writeFile(filePath, data, "utf8");
    console.log(`\x1b[32mUpdated Android build settings in ${filePath}\x1b[0m`);
  } catch (err: any) {
    console.log(`\x1b[31mError updating ${filePath}: ${err.message}\x1b[0m`);
    throw err;
  }
};

// Helper function to update constants.ts
const updateConstants = async (
  filePath: string,
  apiRefId: string,
  domainUrl: string,
  pusherId: string
) => {
  try {
    let data = await fs.readFile(filePath, "utf8");
    // Match export const statements with flexible whitespace and quotes
    const apiRefIdRegex = /export\s+const\s+API_REF_ID\s*=\s*['"].*?['"]/s;
    const domainUrlRegex = /export\s+const\s+DOMAIN_URL\s*=\s*['"].*?['"]/s;
    const pusherIdRegex =
      /export\s+const\s+PUSHER_INSTANCE_ID\s*=\s*['"].*?['"]/s;

    data = data.replace(
      apiRefIdRegex,
      `export const API_REF_ID = '${apiRefId}'`
    );
    data = data.replace(
      domainUrlRegex,
      `export const DOMAIN_URL = '${domainUrl}'`
    );
    data = data.replace(
      pusherIdRegex,
      `export const PUSHER_INSTANCE_ID = '${pusherId}'`
    );

    await fs.writeFile(filePath, data, "utf8");
    console.log(`\x1b[32mUpdated constants in ${filePath}\x1b[0m`);
  } catch (err: any) {
    console.log(`\x1b[31mError updating ${filePath}: ${err.message}\x1b[0m`);
    throw err;
  }
};

// Helper function to update Apple Pay config
const updateApplePayConfig = async (filePath: string, paymentLabel: string) => {
  try {
    let data = await fs.readFile(filePath, "utf8");
    // Match PAYMENT_LABEL with flexible whitespace and quotes
    const paymentLabelRegex = /PAYMENT_LABEL\s*:\s*[`'"].*?[`'"]/s;
    data = data.replace(paymentLabelRegex, `PAYMENT_LABEL: '${paymentLabel}'`);

    await fs.writeFile(filePath, data, "utf8");
    console.log(`\x1b[32mUpdated Apple Pay config in ${filePath}\x1b[0m`);
  } catch (err: any) {
    console.log(`\x1b[31mError updating ${filePath}: ${err.message}\x1b[0m`);
    throw err;
  }
};

// Helper function to update Google Pay config
const updateGooglePayConfig = async (
  filePath: string,
  merchantName: string
) => {
  try {
    let data = await fs.readFile(filePath, "utf8");
    // Match MERCHANT_NAME with flexible whitespace and quotes
    const merchantNameRegex = /MERCHANT_NAME\s*:\s*[`'"].*?[`'"]/s;
    data = data.replace(merchantNameRegex, `MERCHANT_NAME: '${merchantName}'`);

    await fs.writeFile(filePath, data, "utf8");
    console.log(`\x1b[32mUpdated Google Pay config in ${filePath}\x1b[0m`);
  } catch (err: any) {
    console.log(`\x1b[31mError updating ${filePath}: ${err.message}\x1b[0m`);
    throw err;
  }
};

// Main function to update the project for a specific restaurant
export const updateProjectToRestaurant = async (restaurant: Restaurant) => {
  const {
    config: {
      appName,
      apiRefId,
      pusherId,
      environment,
      applePayLabel,
      googlePayMerchant,
      ios: {
        bundleId: iosBundleId,
        buildNumber: iosBuildNumber,
        buildVersion: iosBuildVersion,
      },
      android: {
        bundleId: androidAppId,
        buildNumber: androidBuildNumber,
        buildVersion: androidBuildVersion,
      },
    },
    name: restaurantName,
  } = restaurant;

  console.log(`\x1b[34mUpdating project to ${restaurantName}\x1b[0m`);

  // Update constants.ts
  await updateConstants(
    `${projectPrefix}src/lib/constants.ts`,
    apiRefId,
    getApiUrl(environment),
    pusherId
  );

  // Update Apple Pay config
  await updateApplePayConfig(
    `${projectPrefix}src/lib/hooks/useApplePay.ts`,
    applePayLabel
  );

  // Update Google Pay config
  await updateGooglePayConfig(
    `${projectPrefix}src/lib/hooks/useGooglePay.ts`,
    googlePayMerchant
  );

  // Update Android build.gradle directly
  await updateAndroidGradle(
    `${projectPrefix}android/app/build.gradle`,
    androidAppId,
    androidBuildNumber,
    androidBuildVersion
  );

  // Update Android app name in strings.xml
  await updateContent(
    `${projectPrefix}android/app/src/main/res/values/strings.xml`,
    /<string name="app_name">.*?<\/string>/,
    `<string name="app_name">${appName}</string>`
  );

  // Update iOS project.pbxproj
  await updateIOSProject(
    `${projectPrefix}ios/bitesnbags.xcodeproj/project.pbxproj`,
    iosBundleId,
    iosBuildNumber,
    iosBuildVersion
  );

  // Update iOS Info.plist for location permission
  await updateContent(
    `${projectPrefix}ios/bitesnbags/info.plist`,
    /<string>.* requires your location information in order to deliver to you accurately./,
    `<string>${appName} requires your location information in order to deliver to you accurately.`
  );

  // Copy directories from the UI-generated assets
  const restaurantDir = path.join(
    process.cwd(),
    "public",
    "restaurants",
    restaurantName.toLowerCase().replace(/[^a-z0-9]/g, "")
  );
  await copyDirectory(
    path.join(restaurantDir, "android/res"),
    `${projectPrefix}android/app/src/main/res`,
    true
  );
  await copyDirectory(
    path.join(restaurantDir, "android/json"),
    `${projectPrefix}android/app`,
    true
  );
  await fs.rm(`${projectPrefix}ios/bitesnbags/Images.xcassets`, {
    recursive: true,
    force: true,
  });
  await copyDirectory(
    path.join(restaurantDir, "ios"),
    `${projectPrefix}ios/bitesnbags/Images.xcassets`,
    true
  );

  await copyDirectory(
    path.join(process.cwd(), "public", "ios"),
    `${projectPrefix}ios/bitesnbags/Images.xcassets/Logo.imageset`,
    true
  );

  console.log(
    `\x1b[32mProject updated successfully for ${restaurantName}\x1b[0m`
  );
};
