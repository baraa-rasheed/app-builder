import { useState, useEffect, useRef } from "react";
import fs from "fs/promises";
import path from "path";
import {
  Form,
  useLoaderData,
  useActionData,
  useSubmit,
  useNavigation,
  useNavigate,
} from "react-router";
import { updateProjectToRestaurant } from "~/lib/updateProjectToRestaurant";

// Types
interface Restaurant {
  refId: string;
  name: string;
  config: AppConfig;
}

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

interface AssetFolder {
  files: string[];
  previews: { [key: string]: string };
}

interface LoaderData {
  restaurants: Restaurant[];
  selectedRestaurant?: {
    refId: string;
    name: string;
    config: AppConfig;
    assets: {
      iosAppIcons: AssetFolder;
      iosSplash: AssetFolder;
      iosITunes: AssetFolder;
      androidRes: AssetFolder;
      googleServices: AssetFolder;
    };
  };
}

interface ActionResponse {
  success: boolean;
  error?: string;
  newRestaurant?: Restaurant;
}

// Utility functions
const cn = (...classes: string[]) => classes.filter(Boolean).join(" ");

const getFilePath = (
  baseDir: string,
  key: string,
  fileName: string
): string => {
  if (key === "iosAppIcons") {
    const parts = fileName.split("/");
    const relativePath = parts.slice(1).join("/");
    return path.join(baseDir, "ios", "AppIcon.appiconset", relativePath);
  }
  if (key === "iosSplash") {
    const parts = fileName.split("/");
    const relativePath = parts.slice(1).join("/");
    return path.join(baseDir, "ios", "SplashScreen.imageset", relativePath);
  }
  if (key === "iosITunes")
    return path.join(baseDir, "ios", "Logo.imageset", fileName);
  if (key === "androidRes") {
    const parts = fileName.split("/");
    const relativePath = parts.slice(1).join("/");
    return path.join(baseDir, "android", "res", relativePath);
  }
  if (key === "googleServices")
    return path.join(baseDir, "android", "json", "google-services.json");
  throw new Error(`Unknown file type: ${key}`);
};

export const loader = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const selectedRefId = url.searchParams.get("selected");

  try {
    const filePath = path.join(process.cwd(), "app/data/restaurants.json");
    const fileContent = await fs.readFile(filePath, "utf-8");
    const { restaurants } = JSON.parse(fileContent) as { restaurants: Restaurant[] };

    let result: LoaderData = { restaurants };
    
    if (selectedRefId) {
      const selected = restaurants.find(r => r.refId === selectedRefId);
      if (selected) {
        const baseDir = path.join(
          process.cwd(),
          "public",
          "restaurants",
          selected.name.toLowerCase().replace(/[^a-z0-9]/g, "")
        );

        const assetTypes = [
          { key: "iosAppIcons", path: "ios/AppIcon.appiconset" },
          { key: "iosSplash", path: "ios/SplashScreen.imageset" },
          { key: "iosITunes", path: "ios/Logo.imageset" },
          { key: "androidRes", path: "android/res" },
          { key: "googleServices", path: "android/json", singleFile: "google-services.json" },
        ];

        const assets = {
          iosAppIcons: { files: [], previews: {} },
          iosSplash: { files: [], previews: {} },
          iosITunes: { files: [], previews: {} },
          androidRes: { files: [], previews: {} },
          googleServices: { files: [], previews: {} },
        };

        const readDirRecursive = async (dirPath: string, relativePath: string = ""): Promise<{ files: string[], previews: { [key: string]: string } }> => {
          const entries = await fs.readdir(dirPath, { withFileTypes: true });
          let files: string[] = [];
          let previews: { [key: string]: string } = {};

          for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            const relPath = path.join(relativePath, entry.name);

            if (entry.isDirectory()) {
              const subResult = await readDirRecursive(fullPath, relPath);
              files = files.concat(subResult.files);
              Object.assign(previews, subResult.previews);
            } else if (entry.name.endsWith('.png') || entry.name.endsWith('.jpg') || entry.name.endsWith('.jpeg')) {
              files.push(relPath);
              const buffer = await fs.readFile(fullPath);
              const base64 = buffer.toString("base64");
              const mimeType = entry.name.endsWith('.png') ? "image/png" : "image/jpeg";
              previews[relPath] = `data:${mimeType};base64,${base64}`;
            } else {
              files.push(relPath); // Include non-image files without previews
            }
          }

          return { files, previews };
        };

        for (const { key, path: subPath, singleFile } of assetTypes) {
          try {
            const dirPath = path.join(baseDir, subPath);
            if (key === "androidRes") {
              const { files, previews } = await readDirRecursive(dirPath);
              assets.androidRes = { files, previews };
            } else if (singleFile) {
              const fileNames = await fs.readdir(dirPath).catch(() => []);
              const previews: { [key: string]: string } = {};
              if (fileNames.includes(singleFile)) {
                const filePath = path.join(dirPath, singleFile);
                const buffer = await fs.readFile(filePath);
                const base64 = buffer.toString("base64");
                previews[singleFile] = `data:application/json;base64,${base64}`;
                assets[key as keyof typeof assets] = { files: [singleFile], previews };
              }
            } else {
              const fileNames = await fs.readdir(dirPath).catch(() => []);
              const previews: { [key: string]: string } = {};
              for (const fileName of fileNames) {
                const filePath = path.join(dirPath, fileName);
                const buffer = await fs.readFile(filePath);
                const base64 = buffer.toString("base64");
                const mimeType = fileName.endsWith(".json") ? "application/json" : "image/png";
                previews[fileName] = `data:${mimeType};base64,${base64}`;
              }
              assets[key as keyof typeof assets] = { files: fileNames, previews };
            }
          } catch (error) {
            console.error(`Error loading ${key} assets:`, error);
          }
        }

        result.selectedRestaurant = {
          ...selected,
          assets
        };
      }
    }

    return result;
  } catch (error) {
    console.error("Loader error:", error);
    return { restaurants: [] };
  }
};

export const action = async ({
  request,
}: {
  request: Request;
}): Promise<ActionResponse> => {
  const formData = await request.formData();
  const restaurantDataStr = formData.get("restaurantData") as string;

  if (!restaurantDataStr)
    return { success: false, error: "No restaurant data provided" };

  const restaurantData = JSON.parse(restaurantDataStr) as Restaurant;
  const baseDir = path.join(
    process.cwd(),
    "public",
    "restaurants",
    restaurantData.name.toLowerCase().replace(/[^a-z0-9]/g, "")
  );

  try {
    await fs.mkdir(baseDir, { recursive: true });
    await fs.mkdir(path.join(baseDir, "ios", "AppIcon.appiconset"), { recursive: true });
    await fs.mkdir(path.join(baseDir, "ios", "SplashScreen.imageset"), { recursive: true });
    await fs.mkdir(path.join(baseDir, "ios", "Logo.imageset"), { recursive: true });
    await fs.mkdir(path.join(baseDir, "android", "res"), { recursive: true });
    await fs.mkdir(path.join(baseDir, "android", "json"), { recursive: true });

    for (const [key, value] of formData.entries()) {
      if (
        typeof value !== "string" &&
        "size" in value &&
        "name" in value &&
        value.size > 0
      ) {
        const file = value as {
          size: number;
          name: string;
          arrayBuffer: () => Promise<ArrayBuffer>;
        };
        const buffer = Buffer.from(await file.arrayBuffer());
        const filePath = getFilePath(baseDir, key, file.name);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, buffer);
      }
    }

    const filePath = path.join(process.cwd(), "app/data/restaurants.json");
    let fileContent: { restaurants: Restaurant[] } = { restaurants: [] };
    try {
      const existingContent = await fs.readFile(filePath, "utf-8");
      fileContent = JSON.parse(existingContent);
    } catch {}

    const index = fileContent.restaurants.findIndex(
      (r) => r.refId === restaurantData.refId
    );
    if (index !== -1) fileContent.restaurants[index] = restaurantData;
    else fileContent.restaurants.push(restaurantData);

    await fs.writeFile(filePath, JSON.stringify(fileContent, null, 2));

    await updateProjectToRestaurant(restaurantData);

    return { success: true, newRestaurant: restaurantData };
  } catch (error) {
    console.error(error);
    return { success: false, error: String(error) };
  }
};

// Components
const RestaurantModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (restaurant: Restaurant) => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData() as ActionResponse | undefined;
  const [name, setName] = useState("");
  const [refId, setRefId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const bundleId = `com.bitesnbags.${name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    const newConfig: AppConfig = {
      appName: name,
      apiRefId: "",
      pusherId: "",
      facebookId: "",
      applePayLabel: `${name} (via biteME)`,
      googlePayMerchant: `${name} (via biteME)`,
      environment: "staging",
      ios: { bundleId, buildNumber: "1", buildVersion: "1.0.0" },
      android: { bundleId, buildNumber: "1", buildVersion: "1.0.0" },
    };

    const form = new FormData();
    form.append(
      "restaurantData",
      JSON.stringify({ refId, name, config: newConfig })
    );
    submit(form, { method: "post", encType: "multipart/form-data" });
  };

  useEffect(() => {
    if (actionData?.success && actionData.newRestaurant) {
      onSuccess(actionData.newRestaurant);
      setName("");
      setRefId("");
      onClose();
    }
  }, [actionData, onClose, onSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Add New Restaurant
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Restaurant Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn(
                "w-full px-3 py-2 border border-gray-300 rounded-md",
                "focus:ring-1 focus:ring-black focus:border-black"
              )}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference ID
            </label>
            <input
              type="text"
              value={refId}
              onChange={(e) => setRefId(e.target.value)}
              className={cn(
                "w-full px-3 py-2 border border-gray-300 rounded-md",
                "focus:ring-1 focus:ring-black focus:border-black"
              )}
              required
            />
          </div>
          {actionData?.error && (
            <p className="text-red-500 text-sm">{actionData.error}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "px-4 py-2 bg-gray-200 text-gray-700 rounded-md",
                "hover:bg-gray-300"
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={navigation.state === "submitting"}
              className={cn(
                "px-4 py-2 bg-black text-white rounded-md",
                "hover:bg-gray-800",
                "disabled:bg-gray-500"
              )}
            >
              {navigation.state === "submitting" ? "Saving..." : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SuccessModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-lg text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Congrats!</h3>
        <p className="text-sm text-gray-600 mb-6">
          Your app has been successfully generated.
        </p>
        <button
          onClick={onClose}
          className={cn(
            "px-4 py-2 bg-black text-white rounded-md",
            "hover:bg-gray-800"
          )}
        >
          Close
        </button>
      </div>
    </div>
  );
};

const AssetUploader: React.FC<{
  title: string;
  name: string;
  folder: AssetFolder;
  onFolderChange?: (files: FileList) => void;
  onFileChange: (files: FileList) => void;
  onRemoveFile: (fileName: string) => void;
  multiple?: boolean;
  accept?: string;
}> = ({
  title,
  name,
  folder,
  onFolderChange,
  onFileChange,
  onRemoveFile,
  multiple = true,
  accept = "image/*",
}) => {
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-white p-4 rounded-md border border-gray-200">
      <h4 className="text-md font-medium text-gray-900 mb-3">{title}</h4>
      <div className="space-y-3">
        <div className="flex justify-start gap-3">
          {onFolderChange && (
            <label
              className={cn(
                "px-3 py-2 bg-gray-100 text-gray-900 rounded-md cursor-pointer",
                "hover:bg-gray-200"
              )}
            >
              Upload Folder
              <input
                type="file"
                ref={folderInputRef}
                onChange={(e) =>
                  e.target.files && onFolderChange(e.target.files)
                }
                className="hidden"
                // @ts-ignore
                webkitdirectory=""
                directory=""
              />
            </label>
          )}
          <label
            className={cn(
              "px-3 py-2 bg-gray-100 text-gray-900 rounded-md cursor-pointer",
              "hover:bg-gray-200"
            )}
          >
            Upload Files
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && onFileChange(e.target.files)}
              className="hidden"
              multiple={multiple}
              accept={accept}
            />
          </label>
        </div>
        {folder.files.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-700">
              {folder.files.length} files selected
            </p>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(folder.previews).map(([fileName, preview]) => (
                <div key={fileName} className="relative">
                  <img
                    src={preview}
                    alt={fileName}
                    className="w-12 h-12 rounded-md object-cover border border-gray-200"
                  />
                  <button
                    onClick={() => onRemoveFile(fileName)}
                    className={cn(
                      "absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full",
                      "hover:bg-red-600"
                    )}
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main App Component
const Home: React.FC = () => {
  const { restaurants, selectedRestaurant: initialSelected } = useLoaderData() as LoaderData;
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData() as ActionResponse | undefined;
  const navigate = useNavigate();

  const [selectedRestaurantRefId, setSelectedRestaurantRefId] = useState(initialSelected?.refId || "");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const [config, setConfig] = useState<AppConfig>(
    initialSelected?.config || {
      appName: "",
      apiRefId: "",
      pusherId: "",
      facebookId: "",
      applePayLabel: "",
      googlePayMerchant: "",
      environment: "staging",
      ios: { bundleId: "", buildNumber: "", buildVersion: "" },
      android: { bundleId: "", buildNumber: "", buildVersion: "" },
    }
  );

  const [iosAppIcons, setIosAppIcons] = useState<AssetFolder>(
    initialSelected?.assets.iosAppIcons || { files: [], previews: {} }
  );
  const [iosSplash, setIosSplash] = useState<AssetFolder>(
    initialSelected?.assets.iosSplash || { files: [], previews: {} }
  );
  const [iosITunes, setIosITunes] = useState<AssetFolder>(
    initialSelected?.assets.iosITunes || { files: [], previews: {} }
  );
  const [androidRes, setAndroidRes] = useState<AssetFolder>(
    initialSelected?.assets.androidRes || { files: [], previews: {} }
  );
  const [googleServices, setGoogleServices] = useState<AssetFolder>(
    initialSelected?.assets.googleServices || { files: [], previews: {} }
  );

  const resetAssets = () => {
    setIosAppIcons({ files: [], previews: {} });
    setIosSplash({ files: [], previews: {} });
    setIosITunes({ files: [], previews: {} });
    setAndroidRes({ files: [], previews: {} });
    setGoogleServices({ files: [], previews: {} });
  };

  const resetForm = () => {
    setSelectedRestaurantRefId("");
    resetAssets();
    setConfig({
      appName: "",
      apiRefId: "",
      pusherId: "",
      facebookId: "",
      applePayLabel: "",
      googlePayMerchant: "",
      environment: "staging",
      ios: { bundleId: "", buildNumber: "", buildVersion: "" },
      android: { bundleId: "", buildNumber: "", buildVersion: "" },
    });
    setSubmissionStatus("idle");
    navigate("/");
  };

  useEffect(() => {
    if (actionData?.success && submissionStatus !== "success") {
      if (actionData.newRestaurant && selectedRestaurantRefId !== actionData.newRestaurant.refId) {
        navigate(`/?selected=${actionData.newRestaurant.refId}`);
      } else if (submissionStatus === "submitting") {
        setSubmissionStatus("success");
        setShowSuccessModal(true);
      }
    } else if (actionData?.error && submissionStatus === "submitting") {
      setSubmissionStatus("error");
    }
  }, [actionData, submissionStatus, navigate, selectedRestaurantRefId]);

  useEffect(() => {
    if (initialSelected && initialSelected.refId !== selectedRestaurantRefId) {
      setSelectedRestaurantRefId(initialSelected.refId);
      setConfig(initialSelected.config);
      setIosAppIcons(initialSelected.assets.iosAppIcons);
      setIosSplash(initialSelected.assets.iosSplash);
      setIosITunes(initialSelected.assets.iosITunes);
      setAndroidRes(initialSelected.assets.androidRes);
      setGoogleServices(initialSelected.assets.googleServices);
    }
  }, [initialSelected, selectedRestaurantRefId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      const [platform, field] = name.split(".");
      if (platform === "ios" || platform === "android") {
        setConfig((prev) => ({
          ...prev,
          [platform]: {
            ...prev[platform as "ios" | "android"],
            [field]: value,
          },
        }));
      }
    } else {
      setConfig((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleEnvironmentToggle = () => {
    setConfig((prev) => ({
      ...prev,
      environment: prev.environment === "staging" ? "live" : "staging",
    }));
  };

  const handleFolderChange = (
    type: "iosAppIcons" | "iosSplash" | "androidRes" | "googleServices",
    files: FileList
  ) => {
    const newFiles = Array.from(files);
    const newPreviews: { [key: string]: string } = {};
    const promises = newFiles.map((file) => {
      if (file.type.startsWith("image/") || file.type === "application/json") {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        }).then((preview) => {
          newPreviews[file.webkitRelativePath || file.name] = preview;
        });
      }
      return Promise.resolve();
    });

    Promise.all(promises).then(() => {
      const newFolder = { files: newFiles.map(f => f.name), previews: newPreviews };
      switch (type) {
        case "iosAppIcons":
          setIosAppIcons(newFolder);
          break;
        case "iosSplash":
          setIosSplash(newFolder);
          break;
        case "androidRes":
          setAndroidRes(newFolder);
          break;
        case "googleServices":
          setGoogleServices(newFolder);
          break;
      }
    });
  };

  const handleFileChange = (
    type: "iosAppIcons" | "iosSplash" | "iosITunes" | "androidRes" | "googleServices",
    files: FileList
  ) => {
    const newFiles = Array.from(files);
    const promises = newFiles.map((file) => {
      if (file.type.startsWith("image/") || file.type === "application/json") {
        return new Promise<{ file: File; preview: string }>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () =>
            resolve({ file, preview: reader.result as string });
          reader.readAsDataURL(file);
        });
      }
      return Promise.resolve({ file, preview: "" });
    });

    Promise.all(promises).then((results) => {
      const updateFolder = (prev: AssetFolder) => ({
        files: [...prev.files, ...results.map((r) => r.file.name)],
        previews: {
          ...prev.previews,
          ...Object.fromEntries(
            results.map((r) => [r.file.name, r.preview]).filter((r) => r[1])
          ),
        },
      });
      switch (type) {
        case "iosAppIcons":
          setIosAppIcons(updateFolder);
          break;
        case "iosSplash":
          setIosSplash(updateFolder);
          break;
        case "iosITunes":
          setIosITunes(updateFolder);
          break;
        case "androidRes":
          setAndroidRes(updateFolder);
          break;
        case "googleServices":
          setGoogleServices(updateFolder);
          break;
      }
    });
  };

  const handleRemoveFile = (
    type: "iosAppIcons" | "iosSplash" | "iosITunes" | "androidRes" | "googleServices",
    fileName: string
  ) => {
    const updateFolder = (prev: AssetFolder) => ({
      files: prev.files.filter((f) => f !== fileName),
      previews: Object.fromEntries(
        Object.entries(prev.previews).filter(([key]) => key !== fileName)
      ),
    });
    switch (type) {
      case "iosAppIcons":
        setIosAppIcons(updateFolder);
        break;
      case "iosSplash":
        setIosSplash(updateFolder);
        break;
      case "iosITunes":
        setIosITunes(updateFolder);
        break;
      case "androidRes":
        setAndroidRes(updateFolder);
        break;
      case "googleServices":
        setGoogleServices(updateFolder);
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionStatus("submitting");
    const form = new FormData();
    form.append(
      "restaurantData",
      JSON.stringify({
        refId: selectedRestaurantRefId,
        name: restaurants.find(r => r.refId === selectedRestaurantRefId)?.name || "",
        config,
      })
    );

    iosAppIcons.files.forEach((_, i) => {
      const file = new File([], iosAppIcons.files[i]);
      form.append("iosAppIcons", file);
    });
    iosSplash.files.forEach((_, i) => {
      const file = new File([], iosSplash.files[i]);
      form.append("iosSplash", file);
    });
    iosITunes.files.forEach((_, i) => {
      const file = new File([], iosITunes.files[i]);
      form.append("iosITunes", file);
    });
    androidRes.files.forEach((_, i) => {
      const file = new File([], androidRes.files[i]);
      form.append("androidRes", file);
    });
    googleServices.files.forEach((_, i) => {
      const file = new File([], googleServices.files[i]);
      form.append("googleServices", file);
    });

    submit(form, { method: "post", encType: "multipart/form-data" });
  };

  const handleRestaurantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const refId = e.target.value;
    if (refId !== selectedRestaurantRefId) {
      setSelectedRestaurantRefId(refId);
      navigate(refId ? `/?selected=${refId}` : "/");
    }
  };

  const handleRestaurantAdd = (newRestaurant: Restaurant) => {
    if (newRestaurant.refId !== selectedRestaurantRefId) {
      setSelectedRestaurantRefId(newRestaurant.refId);
      setConfig(newRestaurant.config);
      resetAssets();
      navigate(`/?selected=${newRestaurant.refId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <RestaurantModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleRestaurantAdd}
      />
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          resetForm();
        }}
      />
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-md divide-y divide-gray-200">
        <div className="p-6 bg-gray-50 rounded-t-lg">
          <h1 className="text-2xl font-semibold text-gray-900">
            App Configuration
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Configure your restaurant app settings and assets
          </p>
        </div>
        <Form
          method="post"
          encType="multipart/form-data"
          onSubmit={handleSubmit}
          className="divide-y divide-gray-200"
        >
          <section className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Restaurant Selection
            </h2>
            <div className="flex items-center gap-4">
              <select
                value={selectedRestaurantRefId}
                onChange={handleRestaurantChange}
                className={cn(
                  "w-full max-w-md px-3 py-2 border border-gray-300 rounded-md",
                  "focus:ring-1 focus:ring-black focus:border-black"
                )}
              >
                <option value="">Select a restaurant</option>
                {restaurants.map((r) => (
                  <option key={r.refId} value={r.refId}>
                    {r.name} ({r.refId})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className={cn(
                  "px-4 py-2 bg-black text-white rounded-md",
                  "hover:bg-gray-800"
                )}
              >
                Add New
              </button>
            </div>
          </section>
          
          {selectedRestaurantRefId && (
            <>
              <section className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Configuration
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      App Name
                    </label>
                    <input
                      type="text"
                      name="appName"
                      value={config.appName}
                      onChange={handleInputChange}
                      className={cn(
                        "w-full px-3 py-2 border border-gray-300 rounded-md",
                        "focus:ring-1 focus:ring-black focus:border-black"
                      )}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Reference ID
                    </label>
                    <input
                      type="text"
                      name="apiRefId"
                      value={config.apiRefId}
                      onChange={handleInputChange}
                      className={cn(
                        "w-full px-3 py-2 border border-gray-300 rounded-md",
                        "focus:ring-1 focus:ring-black focus:border-black"
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pusher Instance ID
                    </label>
                    <input
                      type="text"
                      name="pusherId"
                      value={config.pusherId}
                      onChange={handleInputChange}
                      className={cn(
                        "w-full px-3 py-2 border border-gray-300 rounded-md",
                        "focus:ring-1 focus:ring-black focus:border-black"
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Facebook App ID
                    </label>
                    <input
                      type="text"
                      name="facebookId"
                      value={config.facebookId}
                      onChange={handleInputChange}
                      className={cn(
                        "w-full px-3 py-2 border border-gray-300 rounded-md",
                        "focus:ring-1 focus:ring-black focus:border-black"
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Apple Pay Label
                    </label>
                    <input
                      type="text"
                      name="applePayLabel"
                      value={config.applePayLabel}
                      onChange={handleInputChange}
                      className={cn(
                        "w-full px-3 py-2 border border-gray-300 rounded-md",
                        "focus:ring-1 focus:ring-black focus:border-black"
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Google Pay Merchant
                    </label>
                    <input
                      type="text"
                      name="googlePayMerchant"
                      value={config.googlePayMerchant}
                      onChange={handleInputChange}
                      className={cn(
                        "w-full px-3 py-2 border border-gray-300 rounded-md",
                        "focus:ring-1 focus:ring-black focus:border-black"
                      )}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Environment
                    </label>
                    <div className="relative inline-block w-10 select-none">
                      <input
                        type="checkbox"
                        checked={config.environment === "live"}
                        onChange={handleEnvironmentToggle}
                        className="hidden"
                      />
                      <div
                        onClick={handleEnvironmentToggle}
                        className={cn(
                          "w-10 h-6 bg-gray-200 rounded-full cursor-pointer transition-colors",
                          config.environment === "live" ? "bg-green-500" : "bg-gray-200"
                        )}
                      >
                        <div
                          className={cn(
                            "w-4 h-4 bg-white rounded-full absolute top-1 transition-transform",
                            config.environment === "live" ? "translate-x-5" : "translate-x-1"
                          )}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-gray-700">
                      {config.environment === "staging" ? "Staging" : "Live"}
                    </span>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="border border-gray-200 p-4 rounded-md">
                    <h3 className="text-md font-medium text-gray-900 mb-2">
                      iOS Settings
                    </h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        name="ios.bundleId"
                        value={config.ios.bundleId}
                        onChange={handleInputChange}
                        placeholder="Bundle ID"
                        className={cn(
                          "w-full px-3 py-2 border border-gray-300 rounded-md",
                          "focus:ring-1 focus:ring-black focus:border-black"
                        )}
                      />
                      <input
                        type="text"
                        name="ios.buildNumber"
                        value={config.ios.buildNumber}
                        onChange={handleInputChange}
                        placeholder="Build Number"
                        className={cn(
                          "w-full px-3 py-2 border border-gray-300 rounded-md",
                          "focus:ring-1 focus:ring-black focus:border-black"
                        )}
                      />
                      <input
                        type="text"
                        name="ios.buildVersion"
                        value={config.ios.buildVersion}
                        onChange={handleInputChange}
                        placeholder="Version"
                        className={cn(
                          "w-full px-3 py-2 border border-gray-300 rounded-md",
                          "focus:ring-1 focus:ring-black focus:border-black"
                        )}
                      />
                    </div>
                  </div>
                  <div className="border border-gray-200 p-4 rounded-md">
                    <h3 className="text-md font-medium text-gray-900 mb-2">
                      Android Settings
                    </h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        name="android.bundleId"
                        value={config.android.bundleId}
                        onChange={handleInputChange}
                        placeholder="Bundle ID"
                        className={cn(
                          "w-full px-3 py-2 border border-gray-300 rounded-md",
                          "focus:ring-1 focus:ring-black focus:border-black"
                        )}
                      />
                      <input
                        type="text"
                        name="android.buildNumber"
                        value={config.android.buildNumber}
                        onChange={handleInputChange}
                        placeholder="Build Number"
                        className={cn(
                          "w-full px-3 py-2 border border-gray-300 rounded-md",
                          "focus:ring-1 focus:ring-black focus:border-black"
                        )}
                      />
                      <input
                        type="text"
                        name="android.buildVersion"
                        value={config.android.buildVersion}
                        onChange={handleInputChange}
                        placeholder="Version"
                        className={cn(
                          "w-full px-3 py-2 border border-gray-300 rounded-md",
                          "focus:ring-1 focus:ring-black focus:border-black"
                        )}
                      />
                    </div>
                  </div>
                </div>
              </section>
              <section className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Assets</h2>
                <div className="space-y-6">
                  <AssetUploader
                    title="iOS App Icons"
                    name="iosAppIcons"
                    folder={iosAppIcons}
                    onFolderChange={(files) => handleFolderChange("iosAppIcons", files)}
                    onFileChange={(files) => handleFileChange("iosAppIcons", files)}
                    onRemoveFile={(fileName) => handleRemoveFile("iosAppIcons", fileName)}
                  />
                  <AssetUploader
                    title="iOS Splash Screens"
                    name="iosSplash"
                    folder={iosSplash}
                    onFolderChange={(files) => handleFolderChange("iosSplash", files)}
                    onFileChange={(files) => handleFileChange("iosSplash", files)}
                    onRemoveFile={(fileName) => handleRemoveFile("iosSplash", fileName)}
                  />
                  <AssetUploader
                    title="iOS iTunes Artwork"
                    name="iosITunes"
                    folder={iosITunes}
                    onFileChange={(files) => handleFileChange("iosITunes", files)}
                    onRemoveFile={(fileName) => handleRemoveFile("iosITunes", fileName)}
                  />
                  <AssetUploader
                    title="Android Resources"
                    name="androidRes"
                    folder={androidRes}
                    onFolderChange={(files) => handleFolderChange("androidRes", files)}
                    onFileChange={(files) => handleFileChange("androidRes", files)}
                    onRemoveFile={(fileName) => handleRemoveFile("androidRes", fileName)}
                  />
                  <AssetUploader
                    title="Google Services JSON"
                    name="googleServices"
                    folder={googleServices}
                    onFileChange={(files) => handleFileChange("googleServices", files)}
                    onRemoveFile={(fileName) => handleRemoveFile("googleServices", fileName)}
                    multiple={false}
                    accept=".json"
                  />
                </div>
              </section>
              <section className="p-6">
                {actionData?.error && submissionStatus === "error" && (
                  <p className="text-red-500 text-sm mb-4">{actionData.error}</p>
                )}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={navigation.state === "submitting"}
                    className={cn(
                      "px-6 py-2 bg-black text-white rounded-md",
                      "hover:bg-gray-800",
                      "disabled:bg-gray-400 disabled:cursor-not-allowed"
                    )}
                  >
                    {navigation.state === "submitting" ? "Generating..." : "Generate App"}
                  </button>
                </div>
              </section>
            </>
          )}
          
          {!selectedRestaurantRefId && (
            <section className="p-6 text-center text-gray-600">
              <p>Please select a restaurant or add a new one to configure settings and assets.</p>
            </section>
          )}
        </Form>
      </div>
    </div>
  );
};

export default Home;