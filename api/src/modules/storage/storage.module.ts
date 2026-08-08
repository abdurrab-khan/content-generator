import { Global, Module } from '@nestjs/common';
import { STORAGE_SERVICE } from './interfaces/storage.interface.js';
import { LocalStorageService } from './providers/local-storage.service.js';

@Global()
@Module({
  providers: [
    LocalStorageService,
    { provide: STORAGE_SERVICE, useExisting: LocalStorageService },
  ],
  exports: [LocalStorageService, STORAGE_SERVICE],
})
export class StorageModule {}
