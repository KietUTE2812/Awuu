// Test script để kiểm tra API upload
// Chạy: node test-upload.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:7000/api';

// Test 1: Upload base64 image
async function testUploadBase64() {
  console.log('\n🧪 Test 1: Upload image base64...');
  
  try {
    // Tạo một base64 string giả lập (1x1 pixel red PNG)
    const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    
    const response = await axios.post(`${API_URL}/upload-image-base64`, {
      imageData: base64Image,
      fileName: 'test-image'
    });
    
    console.log('✅ Upload thành công!');
    console.log('URL:', response.data.image.url);
    console.log('Format:', response.data.image.format);
    console.log('Size:', `${response.data.image.width}x${response.data.image.height}`);
    
    return response.data.image.url;
  } catch (error) {
    console.error('❌ Lỗi:', error.response?.data || error.message);
    return null;
  }
}

// Test 2: Submit report với ảnh
async function testSubmitReport(imageUrl) {
  console.log('\n🧪 Test 2: Submit report với ảnh...');
  
  try {
    const response = await axios.post(`${API_URL}/submit`, {
      zaloId: 'test_user_123',
      content: 'Đây là báo cáo test với ảnh từ Cloudinary',
      type: 'physical',
      images: imageUrl ? [imageUrl] : [],
      sender_info: {
        name: 'Test User',
        sdt: '0123456789',
        avatar: ''
      }
    });
    
    console.log('✅ Submit report thành công!');
    console.log('Report ID:', response.data.reportId);
    console.log('Fake Name:', response.data.fakeName);
  } catch (error) {
    console.error('❌ Lỗi:', error.response?.data || error.message);
  }
}

// Test 3: Kiểm tra error handling
async function testErrorHandling() {
  console.log('\n🧪 Test 3: Kiểm tra error handling...');
  
  // Test upload không có data
  try {
    await axios.post(`${API_URL}/upload-image-base64`, {});
    console.log('❌ Không nên thành công');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Error handling OK:', error.response.data.error);
    }
  }
  
  // Test submit không có content
  try {
    await axios.post(`${API_URL}/submit`, {
      type: 'physical'
    });
    console.log('❌ Không nên thành công');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Error handling OK:', error.response.data.error);
    }
  }
}

// Chạy tất cả tests
async function runTests() {
  console.log('🚀 Bắt đầu test API Upload...');
  console.log('📍 API URL:', API_URL);
  
  const imageUrl = await testUploadBase64();
  await testSubmitReport(imageUrl);
  await testErrorHandling();
  
  console.log('\n✨ Hoàn thành tất cả tests!\n');
}

runTests();
