import { app } from "./app";
import { appConfig } from "./config/app";
import { storageConfig } from "./config/storage";
import { mulaiPengingat } from "./jobs/pengingat.job";

void storageConfig.cloudinaryUrl;

app.listen(appConfig.PORT);

if (appConfig.PENGINGAT_AKTIF) mulaiPengingat();

console.log(`API berjalan di http://localhost:${appConfig.PORT}/api`);
