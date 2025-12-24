#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function getSSLConfig() {
  const sslMode = process.env.DB_SSL_MODE || 'require';

  console.log(`🔒 SSL Mode: ${sslMode}`);
  
  switch (sslMode.toLowerCase()) {
    case 'disable':
      return false;
    
    case 'require':
      return { rejectUnauthorized: false };
    
    case 'verify-ca':
      return {
        rejectUnauthorized: true,
        ca: process.env.DB_SSL_ROOT_CERT ? [process.env.DB_SSL_ROOT_CERT] : undefined
      };
    
    case 'verify-full':
      return {
        rejectUnauthorized: true,
        ca: process.env.DB_SSL_ROOT_CERT ? [process.env.DB_SSL_ROOT_CERT] : undefined,
        cert: process.env.DB_SSL_CERT,
        key: process.env.DB_SSL_KEY
      };
    
    default:
      console.log(`⚠️ Unknown SSL mode '${sslMode}', defaulting to 'disable'`);
      return false;
  }
}

async function connectToDatabase(retries = 10) {
  const sslConfig = getSSLConfig();
  
  for (let batchIndex = 0; batchIndex < retries; batchIndex++) {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig
    });

    try {
      console.log(`🔌 Attempting to connect to database (attempt ${batchIndex + 1}/${retries})...`);
      await client.connect();
      console.log('✅ Connected to database successfully');
      return client;
    } catch (error) {
      console.log(`❌ Connection failed: ${error.message}`);
      await client.end().catch(() => {}); // Cleanup failed connection
      
      if (batchIndex === retries - 1) {
        throw error;
      }
      console.log(`⏳ Retrying in 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function createSchema(client) {
  console.log('🔧 Creating database schema...');
  
  const schema = `
    -- Create doctors table
    CREATE TABLE IF NOT EXISTS doctors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        specialty VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        rating DECIMAL(3,2) DEFAULT 0.0,
        price_per_hour INTEGER DEFAULT 0,
        avatar TEXT,
        experience_years INTEGER DEFAULT 0,
        languages TEXT DEFAULT 'English',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create appointments table
    CREATE TABLE IF NOT EXISTS appointments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doctor_id UUID NOT NULL REFERENCES doctors(id),
        patient_name VARCHAR(255) NOT NULL,
        patient_email VARCHAR(255) NOT NULL,
        date_time TIMESTAMP NOT NULL,
        duration_minutes INTEGER DEFAULT 30,
        status VARCHAR(50) DEFAULT 'confirmed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create prescriptions table
    CREATE TABLE IF NOT EXISTS prescriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        appointment_id UUID NOT NULL REFERENCES appointments(id),
        doctor_id UUID NOT NULL REFERENCES doctors(id),
        patient_name VARCHAR(255) NOT NULL,
        medications TEXT NOT NULL,
        dosage TEXT NOT NULL,
        instructions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty);
    CREATE INDEX IF NOT EXISTS idx_doctors_location ON doctors(location);
    CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(date_time);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_appointment_id ON prescriptions(appointment_id);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON prescriptions(doctor_id);
  `;

  await client.query(schema);
  console.log('✅ Database schema created successfully');
}

async function checkExistingDoctors(client) {
  try {
    const result = await client.query('SELECT COUNT(*) as count FROM doctors');
    const count = parseInt(result.rows[0].count);
    console.log(`📊 Found ${count} existing doctors in database`);
    return count;
  } catch (error) {
    console.log('ℹ️ Doctors table may not exist yet, will be created during schema setup');
    return 0;
  }
}

async function seedDatabase(client, force = false) {
  try {
    // Create database schema if it doesn't exist
    await createSchema(client);
    
    // Check if we should skip seeding
    const existingCount = await checkExistingDoctors(client);
    
    if (existingCount > 10 && !force) {
      console.log(`⏭️ Database already has ${existingCount} doctors, skipping seed`);
      console.log('   Use FORCE_SEED=true to override');
      return;
    }

    if (force && existingCount > 0) {
      console.log(`🗑️ Force mode: clearing existing data...`);
      // Clear in correct order due to foreign key constraints
      await client.query('DELETE FROM prescriptions');
      console.log('   🗑️ Cleared prescriptions');
      await client.query('DELETE FROM appointments');
      console.log('   🗑️ Cleared appointments');
      await client.query('DELETE FROM doctors');
      console.log('   🗑️ Cleared doctors');
      console.log('✅ Existing data cleared');
    }

    // Generate doctors
    console.log('🏥 Generating seed data...');
    const { generateDoctors } = require('./generate-doctors.js');
    const doctorCount = parseInt(process.env.DOCTOR_COUNT) || 1500;
    const doctors = generateDoctors(doctorCount);
    
    console.log(`💉 Inserting ${doctors.length} doctors into database...`);
    
    // Insert in batches for better performance
    const batchSize = 100;
    let insertedCount = 0;
    
    const insertedDoctors = []; // Keep track of inserted doctors with their IDs
    
    for (let batchIndex = 0; batchIndex < doctors.length; batchIndex += batchSize) {
      const batch = doctors.slice(batchIndex, batchIndex + batchSize);
      
      const values = batch.map((doctor, index) => {
        const baseIndex = index * 8;
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8})`;
      }).join(', ');
      
      const params = batch.flatMap(doctor => [
        doctor.name,
        doctor.specialty,
        doctor.location,
        doctor.rating,
        doctor.price_per_hour,
        doctor.avatar,
        doctor.experience_years,
        doctor.languages
      ]);
      
      const query = `
        INSERT INTO doctors (name, specialty, location, rating, price_per_hour, avatar, experience_years, languages)
        VALUES ${values}
        RETURNING id, name, specialty
      `;
      
      const result = await client.query(query, params);
      insertedDoctors.push(...result.rows);
      insertedCount += batch.length;
      
      console.log(`   📝 Inserted ${insertedCount}/${doctors.length} doctors...`);
    }
    
    // Generate and insert appointments
    console.log(`📅 Generating appointments for ${insertedDoctors.length} doctors...`);
    const { generateAppointments, generatePrescriptions } = require('./generate-appointments.js');
    const appointmentCount = Math.min(parseInt(process.env.APPOINTMENT_COUNT) || 500, insertedDoctors.length * 3); // Max 3 appointments per doctor
    const appointments = generateAppointments(insertedDoctors, appointmentCount);
    
    console.log(`💉 Inserting ${appointments.length} appointments into database...`);
    const insertedAppointments = [];
    
    for (let batchIndex = 0; batchIndex < appointments.length; batchIndex += batchSize) {
      const batch = appointments.slice(batchIndex, batchIndex + batchSize);
      
      const values = batch.map((appointment, index) => {
        const baseIndex = index * 6;
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`;
      }).join(', ');
      
      const params = batch.flatMap(appointment => [
        appointment.doctor_id,
        appointment.patient_name,
        appointment.patient_email,
        appointment.date_time,
        appointment.duration_minutes,
        appointment.status
      ]);
      
      const query = `
        INSERT INTO appointments (doctor_id, patient_name, patient_email, date_time, duration_minutes, status)
        VALUES ${values}
        RETURNING id, doctor_id, patient_name, status
      `;
      
      const result = await client.query(query, params);
      // Merge appointment data with inserted IDs
      result.rows.forEach((row, idx) => {
        insertedAppointments.push({
          ...row,
          ...batch[idx]
        });
      });
      
      console.log(`   📅 Inserted ${Math.min((batchIndex + 1) * batchSize, appointments.length)}/${appointments.length} appointments...`);
    }
    
    // Generate and insert prescriptions for completed appointments
    console.log(`💊 Generating prescriptions for completed appointments...`);
    const prescriptions = generatePrescriptions(insertedAppointments, 0.7); // 70% of completed appointments get prescriptions
    
    if (prescriptions.length > 0) {
      console.log(`💉 Inserting ${prescriptions.length} prescriptions into database...`);
      
      for (let batchIndex = 0; batchIndex < prescriptions.length; batchIndex += batchSize) {
        const batch = prescriptions.slice(batchIndex, batchIndex + batchSize);
        
        const values = batch.map((prescription, index) => {
          const baseIndex = index * 6;
          return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`;
        }).join(', ');
        
        const params = batch.flatMap(prescription => [
          prescription.appointment_id,
          prescription.doctor_id,
          prescription.patient_name,
          prescription.medications,
          prescription.dosage,
          prescription.instructions
        ]);
        
        const query = `
          INSERT INTO prescriptions (appointment_id, doctor_id, patient_name, medications, dosage, instructions)
          VALUES ${values}
        `;
        
        await client.query(query, params);
        console.log(`   💊 Inserted ${Math.min((batchIndex + 1) * batchSize, prescriptions.length)}/${prescriptions.length} prescriptions...`);
      }
    } else {
      console.log(`   ℹ️ No completed appointments found, skipping prescription generation.`);
    }
    
    // Create additional indexes for better performance
    console.log('🔍 Creating additional indexes for better performance...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_doctors_rating ON doctors(rating DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_doctors_price ON doctors(price_per_hour)');
    
    // Get statistics
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM doctors) as total_doctors,
        (SELECT COUNT(DISTINCT specialty) FROM doctors) as specialties_count,
        (SELECT COUNT(DISTINCT location) FROM doctors) as locations_count,
        (SELECT ROUND(AVG(rating), 2) FROM doctors) as avg_rating,
        (SELECT ROUND(AVG(price_per_hour), 2) FROM doctors) as avg_price,
        (SELECT ROUND(AVG(experience_years), 2) FROM doctors) as avg_experience,
        (SELECT COUNT(*) FROM appointments) as total_appointments,
        (SELECT COUNT(*) FROM appointments WHERE status = 'completed') as completed_appointments,
        (SELECT COUNT(*) FROM appointments WHERE status = 'confirmed') as confirmed_appointments,
        (SELECT COUNT(*) FROM appointments WHERE status = 'cancelled') as cancelled_appointments,
        (SELECT COUNT(*) FROM prescriptions) as total_prescriptions
    `);
    
    const statsRow = stats.rows[0];
    console.log(`\n📊 Seeding completed successfully!`);
    console.log(`\n👨‍⚕️ Doctor Statistics:`);
    console.log(`- Total doctors: ${statsRow.total_doctors}`);
    console.log(`- Specialties: ${statsRow.specialties_count}`);
    console.log(`- Locations: ${statsRow.locations_count}`);
    console.log(`- Average rating: ${statsRow.avg_rating}`);
    console.log(`- Average price: $${statsRow.avg_price}`);
    console.log(`- Average experience: ${statsRow.avg_experience} years`);
    
    console.log(`\n📅 Appointment Statistics:`);
    console.log(`- Total appointments: ${statsRow.total_appointments}`);
    console.log(`- Completed: ${statsRow.completed_appointments}`);
    console.log(`- Confirmed (upcoming): ${statsRow.confirmed_appointments}`);
    console.log(`- Cancelled: ${statsRow.cancelled_appointments}`);
    
    console.log(`\n💊 Prescription Statistics:`);
    console.log(`- Total prescriptions: ${statsRow.total_prescriptions}`);
    console.log(`- Prescription rate: ${statsRow.completed_appointments > 0 ? Math.round((row.total_prescriptions / row.completed_appointments) * 100) : 0}% of completed appointments`);
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

async function main() {
  console.log('🌱 Doktolib Database Seeder');
  console.log('===========================');
  
  // Check required environment variables
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  const force = process.env.FORCE_SEED === 'true';
  const doctorCount = parseInt(process.env.DOCTOR_COUNT) || 1500;
  
  console.log(`🔧 Configuration:`);
  console.log(`- Database URL: ${process.env.DATABASE_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  console.log(`- SSL Mode: ${process.env.DB_SSL_MODE || 'disable'}`);
  console.log(`- Doctor Count: ${doctorCount}`);
  console.log(`- Force Mode: ${force}`);
  
  let client;
  
  try {
    client = await connectToDatabase();
    await seedDatabase(client, force);
    console.log('\n🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Seeding failed:', error.message);
    process.exit(1);
    
  } finally {
    if (client) {
      await client.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️ Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️ Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

if (require.main === module) {
  main();
}