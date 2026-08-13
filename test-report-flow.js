// Test script for report LaTeX pipeline flow
// Tests: Report generation -> AI processing -> LaTeX compilation -> PDF download

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Test data for report generation
const testEventId = 'cmrzz0qko00072rraq9tp18p3'; // Use existing event ID from database
const testReportData = {
  eventName: 'Test AI Workshop 2026',
  date: '2026-08-15T09:00:00Z',
  time: '09:00 AM',
  venue: 'Main Auditorium',
  eventType: 'Workshop',
  organizer: 'AI Club',
  facultyCoordinator: 'Dr. Smith',
  studentCoordinators: ['John Doe', 'Jane Smith'],
  resourcePerson: {
    name: 'Dr. Expert Name',
    designation: 'Senior Researcher',
    organization: 'Tech Institute'
  },
  actualParticipants: 85,
  participantStats: {
    registered: 100,
    attended: 85,
    male: 50,
    female: 35,
    others: 0,
    certificatesIssued: 85
  },
  budgetUtilized: [
    { item: 'Venue', amount: 10000 },
    { item: 'Refreshments', amount: 15000 },
    { item: 'Materials', amount: 20000 },
    { item: 'Miscellaneous', amount: 5000 },
    { item: 'Contingency', amount: 3000 }
  ],
  links: {
    driveLink: 'https://drive.google.com/test',
    registrationLink: 'https://example.com/register',
    attendanceLink: 'https://example.com/attendance',
    feedbackLink: 'https://example.com/feedback',
    recordingLink: 'https://example.com/recording',
    presentationLink: 'https://example.com/presentation'
  },
  socialMediaLinks: [
    'https://twitter.com/test',
    'https://instagram.com/test',
    'https://linkedin.com/test'
  ],
  photos: [
    { url: 'photo1.jpg', caption: 'Opening ceremony' },
    { url: 'photo2.jpg', caption: 'Workshop session' },
    { url: 'photo3.jpg', caption: 'Group photo' }
  ],
  reviews: [
    { id: '1', name: 'Student A', dept: 'CS', rating: 5, text: 'Excellent workshop', date: '2026-08-15T09:00:00Z' },
    { id: '2', name: 'Student B', dept: 'CS', rating: 4, text: 'Very informative', date: '2026-08-15T09:00:00Z' }
  ],
  preparedBy: 'Dr. Smith',
  preparedDate: new Date().toISOString(),
  academicYear: '2025-2026',
  clubName: 'AI Club',
  department: 'Computer Science',
  clubHead: 'Dr. Sharma',
  departmentHead: 'Dr. Patel',
  contactInformation: 'Email: ai.club@jainuniversity.ac.in | Phone: +91-1234567890',
  additionalDocuments: 'Event photos, attendance sheets, feedback forms',
  attachmentNotes: 'All documents attached as per university guidelines',
  qrCode: 'QR Code for Event Report'
};

// Function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Step 1: Generate report
async function generateReport() {
  console.log('🔵 Step 1: Generating report...');
  
  const requestData = {
    eventId: testEventId,
    formData: testReportData
  };
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/report/generate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    const response = await makeRequest(options, requestData);
    console.log(`Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const result = JSON.parse(response.body);
      console.log('✅ Report generated successfully');
      console.log(`Report ID: ${result.reportId}`);
      console.log(`Status: ${result.status}`);
      console.log(`Version: ${result.version}`);
      return testEventId;
    } else {
      console.log('❌ Report generation failed');
      console.log('Response:', response.body);
      console.log('Full response:', JSON.stringify(response, null, 2));
      return null;
    }
  } catch (error) {
    console.log('❌ Error generating report:', error.message);
    return null;
  }
}

// Step 2: Download PDF
async function downloadPdf(eventId) {
  console.log('\n🔵 Step 2: Downloading PDF...');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/report/${eventId}/download`,
    method: 'GET'
  };

  try {
    const response = await makeRequest(options);
    console.log(`Status: ${response.statusCode}`);
    console.log(`Content-Type: ${response.headers['content-type']}`);
    console.log(`Content-Disposition: ${response.headers['content-disposition']}`);
    console.log(`Content-Length: ${response.headers['content-length']}`);
    
    if (response.statusCode === 200) {
      const contentType = response.headers['content-type'];
      
      if (contentType.includes('application/pdf')) {
        console.log('✅ PDF downloaded successfully');
        console.log(`PDF size: ${response.body.length} bytes`);
        
        // Check PDF signature
        const signature = response.body.substring(0, 5);
        console.log(`PDF signature: ${signature}`);
        
        // Save PDF to file
        const fs = require('fs');
        fs.writeFileSync('test-report.pdf', response.body);
        console.log('💾 Saved to: test-report.pdf');
        
        // Also check Downloads folder
        const os = require('os');
        const path = require('path');
        const downloadsDir = path.join(os.homedir(), 'Downloads');
        console.log(`📁 Downloads folder: ${downloadsDir}`);
        
        try {
          const files = fs.readdirSync(downloadsDir);
          const reportFiles = files.filter(f => f.startsWith('report') && f.endsWith('.pdf'));
          console.log(`📄 Report files in Downloads: ${reportFiles.join(', ')}`);
          
          if (reportFiles.length > 0) {
            const latestReport = reportFiles[reportFiles.length - 1];
            const latestPath = path.join(downloadsDir, latestReport);
            const latestStats = fs.statSync(latestPath);
            console.log(`📊 Latest report file: ${latestReport}, size: ${latestStats.size} bytes`);
          }
        } catch (err) {
          console.log(`⚠️ Could not check Downloads folder: ${err.message}`);
        }
        
        return true;
      } else if (contentType.includes('application/x-tex')) {
        console.log('⚠️ LaTeX compilation failed, .tex file returned');
        console.log(`TeX size: ${response.body.length} bytes`);
        
        // Save TeX to file
        const fs = require('fs');
        fs.writeFileSync('test-report.tex', response.body);
        console.log('💾 Saved to: test-report.tex');
        console.log('📝 You can compile this manually on Overleaf');
        return false;
      } else {
        console.log('❌ Unexpected content type');
        console.log('Response:', response.body);
        return false;
      }
    } else {
      console.log('❌ Download failed');
      console.log('Response:', response.body);
      return false;
    }
  } catch (error) {
    console.log('❌ Error downloading PDF:', error.message);
    return false;
  }
}

// Main test function
async function runTest() {
  console.log('🚀 Starting Report LaTeX Pipeline Test\n');
  console.log('='.repeat(50));
  
  const eventId = await generateReport();
  
  if (eventId) {
    const pdfSuccess = await downloadPdf(eventId);
    
    console.log('\n' + '='.repeat(50));
    if (pdfSuccess) {
      console.log('✅ Full pipeline test PASSED');
      console.log('✅ LaTeX compilation working locally');
    } else {
      console.log('⚠️ Full pipeline test PARTIAL');
      console.log('⚠️ LaTeX compilation failed, but .tex file available');
    }
  } else {
    console.log('\n' + '='.repeat(50));
    console.log('❌ Full pipeline test FAILED');
    console.log('❌ Report generation failed');
  }
  
  console.log('\n🏁 Test completed');
}

// Run the test
runTest().catch(console.error);
