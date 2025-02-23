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

// Helper function to update file content
const updateContent = async (
  filePath: string,
  oldText: string,
  newText: string
) => {
  try {
    let data = await fs.readFile(filePath, "utf8");
    const updatedContent = data.replaceAll(oldText, newText);
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

// Helper function to get the current restaurant name from the Android strings.xml
const getCurrentRestaurant = async (): Promise<Restaurant> => {
  try {
    const data = await fs.readFile(
      `${projectPrefix}android/app/src/main/res/values/strings.xml`,
      "utf8"
    );
    const restaurantName = data
      .split("\n")[1]
      .replace('<string name="app_name">', "")
      .replace("</string>", "")
      .trim()
      .replace(/\s/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase();

    const restaurantsData = JSON.parse(
      await fs.readFile(
        path.join(process.cwd(), "app/data/restaurants.json"),
        "utf8"
      )
    ).restaurants as Restaurant[];

    const currentRestaurant = restaurantsData.find((r: Restaurant) =>
      restaurantName.includes(r.name.toLowerCase().replace(/[^a-z0-9]/g, ""))
    );

    if (!currentRestaurant)
      throw new Error("Current restaurant not found in restaurants.json");
    return currentRestaurant;
  } catch (err: any) {
    console.log(
      `\x1b[31mError getting current restaurant: ${err.message}\x1b[0m`
    );
    throw err;
  }
};

const getApiUrl = (environment: "staging" | "live") => {
  return environment === "staging"
    ? "https://stg.bitesnbags.com"
    : "https://bitesnbags.com";
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
      ios: { bundleId: iosBundleId },
      android: { bundleId: androidAppId },
    },
    name: restaurantName,
  } = restaurant;

  const currentRestaurant = await getCurrentRestaurant();
  console.log(`\x1b[34mUpdating project to ${restaurantName}\x1b[0m`);

  // Update file content
  const updates = [
    {
      file: `${projectPrefix}src/lib/constants.ts`,
      old: currentRestaurant.config.apiRefId,
      new: apiRefId,
    },
    {
      file: `${projectPrefix}src/lib/constants.ts`,
      old: currentRestaurant.config.pusherId,
      new: pusherId,
    },
    {
      file: `${projectPrefix}src/lib/constants.ts`,
      old: getApiUrl(currentRestaurant.config.environment),
      new: getApiUrl(environment),
    },
    {
      file: `${projectPrefix}src/lib/hooks/useApplePay.ts`,
      old: currentRestaurant.config.applePayLabel,
      new: applePayLabel,
    },
    {
      file: `${projectPrefix}src/lib/hooks/useGooglePay.ts`,
      old: currentRestaurant.config.googlePayMerchant,
      new: googlePayMerchant,
    },
    {
      file: `${projectPrefix}android/app/build.gradle`,
      old: currentRestaurant.config.android.bundleId,
      new: androidAppId,
    },
    {
      file: `${projectPrefix}android/app/src/main/res/values/strings.xml`,
      old: currentRestaurant.config.appName,
      new: appName,
    },
    {
      file: `${projectPrefix}ios/bitesnbags.xcodeproj/project.pbxproj`,
      old: currentRestaurant.config.ios.bundleId,
      new: iosBundleId,
    },
    {
      file: `${projectPrefix}ios/bitesnbags.xcodeproj/project.pbxproj`,
      old: currentRestaurant.config.appName,
      new: appName,
    },
    {
      file: `${projectPrefix}ios/bitesnbags/info.plist`,
      old: "we require your location information in order to deliver to you accurately.",
      new: `${appName} requires your location information in order to deliver to you accurately.`,
    },
  ];

  for (const { file, old, new: newText } of updates) {
    await updateContent(file, old, newText);
  }

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
