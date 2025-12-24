#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// English names and medical specialties
const firstNamesByGender = {
  male: [
    'James', 'Robert', 'John', 'Michael', 'David', 'William', 'Richard', 'Thomas', 'Christopher', 'Charles',
    'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth',
    'Kevin', 'Brian', 'George', 'Timothy', 'Ronald', 'Jason', 'Edward', 'Jeffrey', 'Ryan', 'Jacob',
    'Gary', 'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon', 'Benjamin',
    'Samuel', 'Gregory', 'Alexander', 'Patrick', 'Raymond', 'Jack', 'Dennis', 'Jerry', 'Tyler', 'Aaron'
  ],
  female: [
    'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen',
    'Nancy', 'Lisa', 'Betty', 'Helen', 'Sandra', 'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle',
    'Laura', 'Sarah', 'Kimberly', 'Deborah', 'Dorothy', 'Lisa', 'Nancy', 'Karen', 'Betty', 'Helen',
    'Sandra', 'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle', 'Laura', 'Sarah', 'Kimberly', 'Deborah',
    'Amy', 'Angela', 'Ashley', 'Brenda', 'Emma', 'Olivia', 'Cynthia', 'Marie', 'Janet', 'Frances'
  ]
};

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
  'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes',
  'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper'
];

const specialties = [
  'General Practitioner', 'Cardiologist', 'Dermatologist', 'Gynecologist', 'Pediatrician', 'Psychiatrist', 'Neurologist',
  'Ophthalmologist', 'ENT Specialist', 'Orthopedist', 'Rheumatologist', 'Endocrinologist', 'Gastroenterologist', 'Pulmonologist',
  'Urologist', 'Surgeon', 'Anesthesiologist', 'Radiologist', 'Oncologist', 'Dentist', 'Orthodontist',
  'Oral Surgeon', 'Physical Therapist', 'Osteopath', 'Midwife', 'Nurse Practitioner', 'Pharmacist',
  'Allergist', 'Geriatrician', 'Nephrologist', 'Hematologist', 'Infectious Disease Specialist', 'Occupational Medicine',
  'Emergency Medicine', 'Critical Care Medicine', 'Pathologist', 'Forensic Medicine', 'Addiction Medicine', 'Sexologist'
];

const usaCities = [
  'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ', 'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA',
  'Dallas, TX', 'San Jose, CA', 'Austin, TX', 'Jacksonville, FL', 'Fort Worth, TX', 'Columbus, OH', 'Charlotte, NC', 'San Francisco, CA',
  'Indianapolis, IN', 'Seattle, WA', 'Denver, CO', 'Washington, DC', 'Boston, MA', 'El Paso, TX', 'Nashville, TN', 'Detroit, MI',
  'Oklahoma City, OK', 'Portland, OR', 'Las Vegas, NV', 'Memphis, TN', 'Louisville, KY', 'Baltimore, MD', 'Milwaukee, WI', 'Albuquerque, NM',
  'Tucson, AZ', 'Fresno, CA', 'Sacramento, CA', 'Mesa, AZ', 'Kansas City, MO', 'Atlanta, GA', 'Long Beach, CA', 'Colorado Springs, CO',
  'Raleigh, NC', 'Miami, FL', 'Virginia Beach, VA', 'Omaha, NE', 'Oakland, CA', 'Minneapolis, MN', 'Tulsa, OK', 'Tampa, FL'
];

const languages = [
  'English', 'English, Spanish', 'English, French', 'English, German', 'English, Italian',
  'English, Arabic', 'English, Portuguese', 'English, Spanish, French', 'English, French, Italian',
  'English, German, French', 'English, Mandarin', 'English, Russian', 'English, Japanese'
];

// Avatar URLs from diverse professional photos
const avatarUrls = [
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1594824072407-1cb42b80ef54?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1638202993928-7267aad84c31?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1612531386530-497d5dc1c7cd?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1643297654632-0cc29dd2b1a8?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1584467735871-8e1810b4ed2d?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1577202214328-c04b77cefb5d?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1545167622-3a6ac756afa4?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1619946794135-5bc917a27793?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1651008376811-b98baee60c1f?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1612835362596-72ee7aa8d0b0?w=400&h=400&fit=crop&crop=face'
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max, decimals = 1) {
  return +(Math.random() * (max - min) + min).toFixed(decimals);
}

function generateDoctor(doctorIndex) {
  const isWoman = Math.random() > 0.4; // 60% women, 40% men (realistic for medical field)
  const gender = isWoman ? 'female' : 'male';
  const firstName = getRandomElement(firstNamesByGender[gender]);
  const lastName = getRandomElement(lastNames);
  const specialty = getRandomElement(specialties);
  const location = getRandomElement(usaCities);
  
  // Rating distribution: mostly 4.0-5.0, few lower
  const rating = Math.random() > 0.1 ? getRandomFloat(4.0, 5.0) : getRandomFloat(3.0, 4.0);
  
  // Price based on specialty (specialists cost more) - USD pricing
  const specialistSpecialties = ['Cardiologist', 'Neurologist', 'Surgeon', 'Oncologist', 'Ophthalmologist'];
  const isSpecialist = specialistSpecialties.includes(specialty);
  const basePrice = isSpecialist ? getRandomInt(150, 300) : getRandomInt(80, 180);
  
  // Experience years
  const experienceYears = getRandomInt(3, 40);
  
  // Languages
  const language = getRandomElement(languages);
  
  // Avatar
  const avatar = getRandomElement(avatarUrls);
  
  return {
    id: doctorIndex,
    name: `Dr. ${firstName} ${lastName}`,
    specialty: specialty,
    location: location,
    rating: rating,
    price_per_hour: basePrice,
    avatar: avatar,
    experience_years: experienceYears,
    languages: language
  };
}

function generateDoctors(count) {
  console.log(`Generating ${count} doctors...`);
  const doctors = [];
  
  for (let doctorIndex = 1; doctorIndex <= count; doctorIndex++) {
    doctors.push(generateDoctor(doctorIndex));
    
    if (doctorIndex % 100 === 0) {
      console.log(`Generated ${doctorIndex}/${count} doctors...`);
    }
  }
  
  return doctors;
}

function generateSQL(doctors) {
  console.log('Generating SQL statements...');
  
  let sql = `-- Generated seed data for ${doctors.length} doctors
-- This file contains INSERT statements to populate the doctors table

BEGIN;

-- Clear existing data (optional - remove if you want to keep existing doctors)
-- DELETE FROM doctors;

-- Insert doctors
`;

  // Split into batches of 100 for better performance
  const batchSize = 100;
  for (let batchIndex = 0; batchIndex < doctors.length; batchIndex += batchSize) {
    const batch = doctors.slice(batchIndex, batchIndex + batchSize);
    
    sql += `\n-- Batch ${Math.floor(batchIndex / batchSize) + 1}\n`;
    sql += 'INSERT INTO doctors (name, specialty, location, rating, price_per_hour, avatar, experience_years, languages) VALUES\n';
    
    const values = batch.map(doctor => 
      `  ('${doctor.name.replace(/'/g, "''")}', '${doctor.specialty}', '${doctor.location}', ${doctor.rating}, ${doctor.price_per_hour}, '${doctor.avatar}', ${doctor.experience_years}, '${doctor.languages.replace(/'/g, "''")}')`
    );
    
    sql += values.join(',\n') + ';\n';
  }

  sql += `
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty);
CREATE INDEX IF NOT EXISTS idx_doctors_location ON doctors(location);
CREATE INDEX IF NOT EXISTS idx_doctors_rating ON doctors(rating DESC);
CREATE INDEX IF NOT EXISTS idx_doctors_price ON doctors(price_per_hour);

COMMIT;

-- Statistics
SELECT 
  COUNT(*) as total_doctors,
  COUNT(DISTINCT specialty) as specialties_count,
  COUNT(DISTINCT location) as locations_count,
  ROUND(AVG(rating), 2) as avg_rating,
  ROUND(AVG(price_per_hour), 2) as avg_price,
  ROUND(AVG(experience_years), 2) as avg_experience
FROM doctors;
`;

  return sql;
}

function main() {
  const doctorCount = parseInt(process.argv[2]) || 1500;
  
  console.log(`🏥 Doktolib Seed Data Generator`);
  console.log(`===============================`);
  console.log(`Generating ${doctorCount} doctors with realistic English data...`);
  
  const doctors = generateDoctors(doctorCount);
  const sql = generateSQL(doctors);
  
  // Write SQL file
  const sqlPath = path.join(__dirname, 'doctors-seed.sql');
  fs.writeFileSync(sqlPath, sql, 'utf8');
  console.log(`✅ SQL file written to: ${sqlPath}`);
  
  // Write JSON file for reference
  const jsonPath = path.join(__dirname, 'doctors-seed.json');
  fs.writeFileSync(jsonPath, JSON.stringify(doctors, null, 2), 'utf8');
  console.log(`✅ JSON file written to: ${jsonPath}`);
  
  // Statistics
  const specialtyStats = {};
  const locationStats = {};
  
  doctors.forEach(doctor => {
    specialtyStats[doctor.specialty] = (specialtyStats[doctor.specialty] || 0) + 1;
    locationStats[doctor.location] = (locationStats[doctor.location] || 0) + 1;
  });
  
  console.log(`\n📊 Statistics:`);
  console.log(`- Total doctors: ${doctors.length}`);
  console.log(`- Specialties: ${Object.keys(specialtyStats).length}`);
  console.log(`- Locations: ${Object.keys(locationStats).length}`);
  console.log(`- Average rating: ${(doctors.reduce((sum, d) => sum + d.rating, 0) / doctors.length).toFixed(2)}`);
  console.log(`- Average price: €${Math.round(doctors.reduce((sum, d) => sum + d.price_per_hour, 0) / doctors.length)}`);
  console.log(`- Average experience: ${Math.round(doctors.reduce((sum, d) => sum + d.experience_years, 0) / doctors.length)} years`);
  
  console.log(`\n🚀 Ready for deployment!`);
  console.log(`Run the seed script with: node seed.js`);
}

if (require.main === module) {
  main();
}

module.exports = { generateDoctors, generateSQL };