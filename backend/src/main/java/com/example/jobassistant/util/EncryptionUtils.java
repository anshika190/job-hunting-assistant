package com.example.jobassistant.util;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

public class EncryptionUtils {

    private static final int IV_SIZE = 12; // 12 bytes optimal for GCM
    private static final int TAG_BIT_LENGTH = 128; // 128 bit auth tag

    private static SecretKeySpec getSecretKeySpec(String secretKey) throws Exception {
        MessageDigest sha = MessageDigest.getInstance("SHA-256");
        byte[] key = secretKey.getBytes(StandardCharsets.UTF_8);
        key = sha.digest(key);
        return new SecretKeySpec(key, "AES");
    }

    public static String encrypt(String value, String secretKey) throws Exception {
        SecretKeySpec keySpec = getSecretKeySpec(secretKey);
        
        // Generate random IV
        byte[] iv = new byte[IV_SIZE];
        SecureRandom random = new SecureRandom();
        random.nextBytes(iv);
        
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        GCMParameterSpec parameterSpec = new GCMParameterSpec(TAG_BIT_LENGTH, iv);
        cipher.init(Cipher.ENCRYPT_MODE, keySpec, parameterSpec);
        
        byte[] ciphertext = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
        
        // Prepend IV to ciphertext
        ByteBuffer byteBuffer = ByteBuffer.allocate(iv.length + ciphertext.length);
        byteBuffer.put(iv);
        byteBuffer.put(ciphertext);
        
        return Base64.getEncoder().encodeToString(byteBuffer.array());
    }

    public static String decrypt(String encryptedValue, String secretKey) throws Exception {
        SecretKeySpec keySpec = getSecretKeySpec(secretKey);
        
        byte[] decodedBytes = Base64.getDecoder().decode(encryptedValue);
        
        // Extract IV and ciphertext
        ByteBuffer byteBuffer = ByteBuffer.wrap(decodedBytes);
        byte[] iv = new byte[IV_SIZE];
        byteBuffer.get(iv);
        
        byte[] ciphertext = new byte[byteBuffer.remaining()];
        byteBuffer.get(ciphertext);
        
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        GCMParameterSpec parameterSpec = new GCMParameterSpec(TAG_BIT_LENGTH, iv);
        cipher.init(Cipher.DECRYPT_MODE, keySpec, parameterSpec);
        
        byte[] decryptedBytes = cipher.doFinal(ciphertext);
        return new String(decryptedBytes, StandardCharsets.UTF_8);
    }
}
