package com.cloudstorage.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.*;
import java.nio.file.*;
import java.util.UUID;

@Service
@Slf4j
public class StorageService {

    @Value("${storage.type}")
    private String storageType;

    @Value("${storage.local.upload-dir}")
    private String uploadDir;

    @Value("${storage.s3.bucket-name:}")
    private String bucketName;

    private final EncryptionService encryptionService;
    private S3Client s3Client;

    public StorageService(EncryptionService encryptionService) {
        this.encryptionService = encryptionService;
    }

    public String store(MultipartFile file, String userId, boolean encrypt) throws Exception {
        String filename = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        String key = "users/" + userId + "/" + filename;

        byte[] fileBytes = file.getBytes();
        if (encrypt) {
            fileBytes = encryptionService.encrypt(fileBytes);
        }

        if ("s3".equals(storageType)) {
            return storeToS3(fileBytes, key, file.getContentType());
        } else {
            return storeToLocal(fileBytes, key);
        }
    }

    public InputStream retrieve(String storageKey, boolean encrypted) throws Exception {
        byte[] data;
        if ("s3".equals(storageType)) {
            data = retrieveFromS3(storageKey);
        } else {
            data = retrieveFromLocal(storageKey);
        }

        if (encrypted) {
            data = encryptionService.decrypt(data);
        } else {
            boolean appearsEncrypted = true;
            if (data.length >= 4) {
                boolean isPdf = data[0] == 0x25 && data[1] == 0x50 && data[2] == 0x44 && data[3] == 0x46;
                boolean isPng = (data[0] & 0xFF) == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47;
                boolean isJpg = (data[0] & 0xFF) == 0xFF && (data[1] & 0xFF) == 0xD8 && (data[2] & 0xFF) == 0xFF;
                boolean isGif = data[0] == 0x47 && data[1] == 0x49 && data[2] == 0x46 && data[3] == 0x38;
                
                if (isPdf || isPng || isJpg || isGif) {
                    appearsEncrypted = false;
                }
            }
            
            if (appearsEncrypted) {
                try {
                    byte[] decryptedData = encryptionService.decrypt(data);
                    if (decryptedData.length >= 4) {
                        boolean decPdf = decryptedData[0] == 0x25 && decryptedData[1] == 0x50 && decryptedData[2] == 0x44 && decryptedData[3] == 0x46;
                        boolean decPng = (decryptedData[0] & 0xFF) == 0x89 && decryptedData[1] == 0x50 && decryptedData[2] == 0x4E && decryptedData[3] == 0x47;
                        boolean decJpg = (decryptedData[0] & 0xFF) == 0xFF && (decryptedData[1] & 0xFF) == 0xD8 && (decryptedData[2] & 0xFF) == 0xFF;
                        
                        if (decPdf || decPng || decJpg) {
                            log.info("Auto-healed encrypted file detection for: {}", storageKey);
                            data = decryptedData;
                        }
                    }
                } catch (Exception e) {
                    // Fall back to original bytes
                }
            }
        }
        return new ByteArrayInputStream(data);
    }

    public void delete(String storageKey) throws Exception {
        if ("s3".equals(storageType)) {
            deleteFromS3(storageKey);
        } else {
            deleteFromLocal(storageKey);
        }
    }

    // --- Local Storage ---

    private String storeToLocal(byte[] data, String key) throws IOException {
        Path targetPath = Paths.get(uploadDir).resolve(key);
        Files.createDirectories(targetPath.getParent());
        Files.write(targetPath, data);
        log.info("Stored file locally: {}", targetPath);
        return key;
    }

    private byte[] retrieveFromLocal(String key) throws IOException {
        Path filePath = Paths.get(uploadDir).resolve(key);
        return Files.readAllBytes(filePath);
    }

    private void deleteFromLocal(String key) throws IOException {
        Path filePath = Paths.get(uploadDir).resolve(key);
        Files.deleteIfExists(filePath);
    }

    // --- S3 Storage ---

    private String storeToS3(byte[] data, String key, String contentType) {
        getS3Client().putObject(
                PutObjectRequest.builder()
                        .bucket(bucketName)
                        .key(key)
                        .contentType(contentType)
                        .build(),
                RequestBody.fromBytes(data)
        );
        return key;
    }

    private byte[] retrieveFromS3(String key) throws IOException {
        try (InputStream s3Stream = getS3Client().getObjectAsBytes(
                GetObjectRequest.builder().bucket(bucketName).key(key).build()
        ).asInputStream()) {
            return s3Stream.readAllBytes();
        }
    }

    private void deleteFromS3(String key) {
        getS3Client().deleteObject(
                DeleteObjectRequest.builder().bucket(bucketName).key(key).build()
        );
    }

    private S3Client getS3Client() {
        if (s3Client == null) {
            s3Client = S3Client.builder().build();
        }
        return s3Client;
    }
}
