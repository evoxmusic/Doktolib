#!/usr/bin/env node

const axios = require('axios');
const faker = require('faker');

// Configuration
const loadTestConfig = {
  apiUrl: process.env.BACKEND_URL || 'http://127.0.0.1:8080',
  scenario: process.env.SCENARIO || 'normal',
  duration: parseInt(process.env.DURATION_MINUTES) || 60, // minutes
  logLevel: process.env.LOG_LEVEL || 'info'
};

// Load scenarios
const scenarios = {
  light: {
    name: 'Light Load',
    description: 'Simulates 10-20 concurrent users',
    concurrent: 15,
    requestsPerMinute: 30,
    appointmentRatio: 0.1 // 10% of users book appointments
  },
  normal: {
    name: 'Normal Load', 
    description: 'Simulates 50-100 concurrent users',
    concurrent: 75,
    requestsPerMinute: 150,
    appointmentRatio: 0.15
  },
  heavy: {
    name: 'Heavy Load',
    description: 'Simulates 200-300 concurrent users', 
    concurrent: 250,
    requestsPerMinute: 500,
    appointmentRatio: 0.2
  },
  stress: {
    name: 'Stress Test',
    description: 'Maximum load test with 500+ concurrent users',
    concurrent: 500,
    requestsPerMinute: 1000,
    appointmentRatio: 0.25
  }
};

// Statistics tracking
const loadTestStats = {
  requests: {
    total: 0,
    successful: 0,
    failed: 0,
    errors: {}
  },
  endpoints: {
    '/api/v1/doctors': { requests: 0, success: 0, avgTime: 0 },
    '/api/v1/doctors/:id': { requests: 0, success: 0, avgTime: 0 },
    '/api/v1/appointments': { requests: 0, success: 0, avgTime: 0 },
    '/api/v1/health': { requests: 0, success: 0, avgTime: 0 }
  },
  startTime: Date.now(),
  responseTimes: []
};

// Realistic search patterns
const searchPatterns = [
  { specialty: 'Cardiologist', location: 'New York, NY' },
  { specialty: 'General Practitioner', location: 'Los Angeles, CA' },
  { specialty: 'Dermatologist', location: 'Chicago, IL' },
  { specialty: 'Pediatrician', location: 'Houston, TX' },
  { specialty: '', location: 'San Francisco, CA' }, // Location only
  { specialty: 'Psychiatrist', location: '' }, // Specialty only
  { specialty: '', location: '' }, // Browse all
];

class LoadGenerator {
  constructor(scenario) {
    this.scenario = scenarios[scenario] || scenarios.normal;
    this.running = false;
    this.workers = [];
    this.doctorsListList = [];
    
    console.log(`🚀 Starting ${this.scenario.name}`);
    console.log(`📊 ${this.scenario.description}`);
    console.log(`🎯 Target: ${this.scenario.requestsPerMinute} req/min with ${this.scenario.concurrent} concurrent users`);
    console.log(`⏱️  Duration: ${loadTestConfig.duration} minutes`);
    console.log(`🔗 API: ${loadTestConfig.apiUrl}`);
  }

  async initialize() {
    try {
      // Test API connectivity
      console.log('🔍 Testing API connectivity...');
      const healthResponse = await axios.get(`${loadTestConfig.apiUrl}/api/v1/health`, { timeout: 5000 });
      console.log('✅ API is healthy');

      // Preload doctors list for realistic appointment booking
      console.log('👨‍⚕️ Loading doctors list...');
      const doctorsResponse = await axios.get(`${loadTestConfig.apiUrl}/api/v1/doctors?limit=50`);
      this.doctorsListList = doctorsResponse.data || [];
      console.log(`📋 Loaded ${this.doctorsListList.length} doctors for appointment simulation`);
      
    } catch (error) {
      console.error('❌ Failed to initialize:', error.message);
      console.error('💡 Make sure the API is running at:', loadTestConfig.apiUrl);
      process.exit(1);
    }
  }

  async makeRequest(endpoint, method = 'GET', data = null) {
    const startTime = Date.now();
    const endpointKey = endpoint.replace(/\/\d+/, '/:id'); // Normalize URLs with IDs
    
    try {
      loadTestStats.requests.total++;
      loadTestStats.endpoints[endpointKey] = loadTestStats.endpoints[endpointKey] || { requests: 0, success: 0, avgTime: 0 };
      loadTestStats.endpoints[endpointKey].requests++;

      const config = {
        method,
        url: `${this.apiUrl}${endpoint}`,
        timeout: 10000,
        headers: { 'User-Agent': 'Doktolib-LoadGenerator/1.0' }
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        config.data = data;
        config.headers['Content-Type'] = 'application/json';
      }

      const response = await axios(config);
      
      // Track success
      const responseTime = Date.now() - startTime;
      loadTestStats.requests.successful++;
      loadTestStats.endpoints[endpointKey].success++;
      loadTestStats.responseTimes.push(responseTime);
      
      // Update average response time
      const endpoint_stats = loadTestStats.endpoints[endpointKey];
      endpoint_stats.avgTime = (endpoint_stats.avgTime * (endpoint_stats.success - 1) + responseTime) / endpoint_stats.success;

      if (loadTestConfig.logLevel === 'debug') {
        console.log(`✅ ${method} ${endpoint} - ${response.status} (${responseTime}ms)`);
      }

      return response;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      loadTestStats.requests.failed++;
      
      // Track error types
      const errorType = error.code || error.response?.status || 'unknown';
      loadTestStats.requests.errors[errorType] = (loadTestStats.requests.errors[errorType] || 0) + 1;

      if (loadTestConfig.logLevel === 'debug' || loadTestConfig.logLevel === 'info') {
        console.log(`❌ ${method} ${endpoint} - Error: ${errorType} (${responseTime}ms)`);
      }

      return null;
    }
  }

  getRandomSearchPattern() {
    return searchPatterns[Math.floor(Math.random() * searchPatterns.length)];
  }

  getRandomDoctor() {
    return this.doctorsList[Math.floor(Math.random() * this.doctorsList.length)];
  }

  generateAppointmentData() {
    const doctor = this.getRandomDoctor();
    if (!doctor) return null;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 14) + 1); // 1-14 days ahead
    
    return {
      doctor_id: doctor.id,
      patient_name: faker.name.findName(),
      patient_email: faker.internet.email(),
      date_time: futureDate.toISOString(),
      duration_minutes: Math.random() > 0.5 ? 30 : 60
    };
  }

  async simulateUserSession() {
    const sessionActions = [];
    
    // 1. Always start with health check (1% of requests)
    if (Math.random() < 0.01) {
      sessionActions.push(() => this.makeRequest('/api/v1/health'));
    }

    // 2. Browse doctors (70% of sessions)
    if (Math.random() < 0.7) {
      const pattern = this.getRandomSearchPattern();
      const params = new URLSearchParams();
      if (pattern.specialty) params.append('specialty', pattern.specialty);
      if (pattern.location) params.append('location', pattern.location);
      
      sessionActions.push(() => this.makeRequest(`/api/v1/doctors?${params.toString()}`));
    }

    // 3. View specific doctor details (40% of sessions)
    if (Math.random() < 0.4 && this.doctorsList.length > 0) {
      const doctor = this.getRandomDoctor();
      sessionActions.push(() => this.makeRequest(`/api/v1/doctors/${doctor.id}`));
    }

    // 4. Book appointment (based on scenario ratio)
    if (Math.random() < this.scenario.appointmentRatio) {
      const appointmentData = this.generateAppointmentData();
      if (appointmentData) {
        sessionActions.push(() => this.makeRequest('/api/v1/appointments', 'POST', appointmentData));
      }
    }

    // Execute all actions in the session
    for (const action of sessionActions) {
      await action();
      
      // Random delay between actions (0.5-3 seconds)
      const delay = 500 + Math.random() * 2500;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  async startWorker(workerId) {
    const requestInterval = (60 * 1000) / (this.scenario.requestsPerMinute / this.scenario.concurrent);
    
    while (this.running) {
      try {
        await this.simulateUserSession();
        
        // Random delay between sessions (1-10 seconds)
        const delay = 1000 + Math.random() * 9000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } catch (error) {
        console.error(`Worker ${workerId} error:`, error.message);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s on error
      }
    }
  }

  printStats() {
    const runtime = (Date.now() - loadTestStats.startTime) / 1000 / 60; // minutes
    const requestRate = loadTestStats.requests.total / runtime;
    const successRate = (loadTestStats.requests.successful / loadTestStats.requests.total * 100).toFixed(1);
    
    // Calculate percentiles
    const sortedTimes = loadTestStats.responseTimes.sort((a, b) => a - b);
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0;
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;
    const avgTime = sortedTimes.length > 0 ? sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length : 0;

    console.log('\n📊 LOAD GENERATION STATISTICS');
    console.log('='.repeat(50));
    console.log(`⏱️  Runtime: ${runtime.toFixed(1)} minutes`);
    console.log(`📈 Request Rate: ${requestRate.toFixed(1)} req/min`);
    console.log(`✅ Success Rate: ${successRate}% (${loadTestStats.requests.successful}/${loadTestStats.requests.total})`);
    console.log(`❌ Failed Requests: ${loadTestStats.requests.failed}`);
    
    console.log('\n🚀 RESPONSE TIMES:');
    console.log(`Average: ${avgTime.toFixed(0)}ms`);
    console.log(`P50: ${p50}ms | P95: ${p95}ms | P99: ${p99}ms`);
    
    console.log('\n🎯 ENDPOINT BREAKDOWN:');
    Object.entries(loadTestStats.endpoints).forEach(([endpoint, stat]) => {
      if (stat.requests > 0) {
        const successRate = (stat.success / stat.requests * 100).toFixed(1);
        console.log(`${endpoint}: ${stat.requests} req, ${successRate}% success, ${stat.avgTime.toFixed(0)}ms avg`);
      }
    });

    if (Object.keys(loadTestStats.requests.errors).length > 0) {
      console.log('\n⚠️  ERROR BREAKDOWN:');
      Object.entries(loadTestStats.requests.errors).forEach(([error, count]) => {
        console.log(`${error}: ${count} occurrences`);
      });
    }

    console.log('\n');
  }

  async start() {
    await this.initialize();
    
    this.apiUrl = config.apiUrl;
    this.running = true;
    
    // Start workers
    console.log(`🔥 Starting ${this.scenario.concurrent} concurrent workers...`);
    for (let i = 0; i < this.scenario.concurrent; i++) {
      this.workers.push(this.startWorker(i + 1));
    }

    // Print loadTestStats every 30 seconds
    const statsInterval = setInterval(() => {
      if (this.running) {
        this.printStats();
      } else {
        clearInterval(statsInterval);
      }
    }, 30000);

    // Stop after configured duration
    setTimeout(() => {
      this.stop();
    }, loadTestConfig.duration * 60 * 1000);
  }

  stop() {
    console.log('\n🛑 Stopping load generation...');
    this.running = false;
    
    setTimeout(() => {
      this.printStats();
      console.log('✅ Load generation completed!');
      process.exit(0);
    }, 2000);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, stopping load generation...');
  if (global.loadGenerator) {
    global.loadGenerator.stop();
  } else {
    process.exit(0);
  }
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, stopping load generation...');
  if (global.loadGenerator) {
    global.loadGenerator.stop();
  } else {
    process.exit(0);
  }
});

// Main execution
async function main() {
  console.log('🎭 Doktolib Load Generator v1.0');
  console.log(`📋 Available scenarios: ${Object.keys(scenarios).join(', ')}`);
  
  global.loadGenerator = new LoadGenerator(config.scenario);
  await global.loadGenerator.start();
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = LoadGenerator;