import React, { useState } from 'react';
import { useMembers } from '../context/MembersContext';
import { uploadCustomerRecordsFromFile } from '../utils/excel-upload';
import HamburgerMenu from '../components/HamburgerMenu';

function UploadPage() {
  const { createMember } = useMembers();

  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadResults, setUploadResults] = useState(null);

  const handleCreateMember = async () => {
    try {
      setMessage('Creating member...');

      const userId = await createMember(
        'B000', // id - unique timestamp-based ID
        "Zachary Kim",            // name
        "2022 Hyundai Tucson, blue",   // car
        true,                  // isActive
        true,                  // validPayment
        "Test member created from test page" // notes
      );

      setMessage(`Successfully created member with ID: ${userId}`);
      // console.log('Created member:', userId);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
      console.error('Error creating member:', error);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadResults(null);
      setMessage('');
    }
  };

  const handleExcelUpload = async () => {
    if (!selectedFile) {
      setMessage('Please select an Excel file first');
      return;
    }

    try {
      setMessage('Uploading Excel file and creating members...');
      setUploadResults(null);

      const results = await uploadCustomerRecordsFromFile(selectedFile, createMember);

      setUploadResults(results);
      setMessage('Upload complete! See results below.');
      // console.log('Upload results:', results);
    } catch (error) {
      setMessage(`Error uploading Excel: ${error.message}`);
      console.error('Error uploading Excel:', error);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <HamburgerMenu />
      <h1>Test Page</h1>

      <div style={{ 
        marginBottom: '30px', 
        padding: '20px', 
        border: '1px solid #e0e0e0', 
        borderRadius: '8px',
        backgroundColor: '#fafafa'
      }}>
        <h2 style={{ marginTop: 0 }}>Single Member Test</h2>
        <button
          onClick={handleCreateMember}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            minWidth: '150px'
          }}
        >
          Create Test Member
        </button>
      </div>

      <div style={{ 
        marginBottom: '30px', 
        padding: '20px', 
        border: '1px solid #e0e0e0', 
        borderRadius: '8px',
        backgroundColor: '#fafafa'
      }}>
        <h2 style={{ marginTop: 0 }}>Excel Upload</h2>

        <div style={{ marginBottom: '15px' }}>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            style={{
              padding: '8px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              width: '100%',
              maxWidth: '600px'
            }}
          />
        </div>

        {selectedFile && (
          <p style={{ 
            fontSize: '14px', 
            color: '#666', 
            marginBottom: '15px',
            padding: '8px',
            backgroundColor: '#e8f5e8',
            borderRadius: '4px',
            border: '1px solid #4CAF50'
          }}>
            Selected file: <strong>{selectedFile.name}</strong>
          </p>
        )}

        <button
          onClick={handleExcelUpload}
          disabled={!selectedFile}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: selectedFile ? '#2196F3' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedFile ? 'pointer' : 'not-allowed',
            minWidth: '150px'
          }}
        >
          Upload Excel File
        </button>
      </div>

      {message && (
        <p style={{ marginTop: '20px', fontSize: '14px', fontWeight: 'bold' }}>
          {message}
        </p>
      )}

      {uploadResults && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          backgroundColor: '#f9f9f9'
        }}>
          <h3>Upload Results</h3>
          <p><strong>Total rows processed:</strong> {uploadResults.total}</p>
          <p style={{ color: 'green' }}><strong>Successful:</strong> {uploadResults.successful}</p>
          <p style={{ color: 'red' }}><strong>Failed:</strong> {uploadResults.failed}</p>

          {uploadResults.errors.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <h4>Errors:</h4>
              <ul style={{ fontSize: '14px', color: '#d32f2f' }}>
                {uploadResults.errors.map((err, index) => (
                  <li key={index}>
                    Row {err.row}: {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UploadPage;