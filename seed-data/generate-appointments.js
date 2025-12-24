#!/usr/bin/env node

// Sample patient names and emails
const patientNames = [
  'John Smith', 'Emma Johnson', 'Michael Brown', 'Sarah Wilson', 'David Miller',
  'Lisa Davis', 'Robert Garcia', 'Jessica Martinez', 'William Rodriguez', 'Ashley Hernandez',
  'Christopher Lopez', 'Amanda Gonzalez', 'Matthew Anderson', 'Stephanie Thomas', 'Daniel Taylor',
  'Jennifer Moore', 'Joseph Martin', 'Rebecca Jackson', 'James White', 'Michelle Harris',
  'Mark Thompson', 'Laura Clark', 'Paul Lewis', 'Karen Robinson', 'Steven Walker',
  'Nancy Perez', 'Kenneth Young', 'Betty Hall', 'Edward Allen', 'Dorothy Sanchez',
  'Brian Wright', 'Carol King', 'George Scott', 'Sandra Green', 'Jason Adams',
  'Sharon Baker', 'Kevin Nelson', 'Barbara Carter', 'Timothy Mitchell', 'Donna Roberts',
  'Richard Turner', 'Lisa Phillips', 'Jeffrey Campbell', 'Linda Parker', 'Frank Evans',
  'Susan Edwards', 'Scott Collins', 'Patricia Stewart', 'Gregory Flores', 'Deborah Morris'
];

// Medical prescription templates
const medicationTemplates = [
  {
    medications: 'Amoxicillin 500mg',
    dosage: '1 capsule twice daily',
    instructions: 'Take with food. Complete entire course even if symptoms improve.'
  },
  {
    medications: 'Ibuprofen 200mg',
    dosage: '1-2 tablets every 6-8 hours as needed',
    instructions: 'Take with food to avoid stomach upset. Do not exceed 6 tablets in 24 hours.'
  },
  {
    medications: 'Lisinopril 10mg',
    dosage: '1 tablet once daily in the morning',
    instructions: 'Monitor blood pressure regularly. Avoid potassium supplements.'
  },
  {
    medications: 'Metformin 500mg',
    dosage: '1 tablet twice daily with meals',
    instructions: 'Monitor blood sugar levels. Take with breakfast and dinner.'
  },
  {
    medications: 'Omeprazole 20mg',
    dosage: '1 capsule once daily before breakfast',
    instructions: 'Take 30 minutes before eating. Can take with water.'
  },
  {
    medications: 'Atorvastatin 20mg',
    dosage: '1 tablet once daily at bedtime',
    instructions: 'Take at the same time each day. Avoid grapefruit juice.'
  },
  {
    medications: 'Albuterol Inhaler',
    dosage: '2 puffs every 4-6 hours as needed',
    instructions: 'Shake well before use. Rinse mouth after use to prevent thrush.'
  },
  {
    medications: 'Sertraline 50mg',
    dosage: '1 tablet once daily',
    instructions: 'Take at the same time each day. May take 4-6 weeks for full effect.'
  }
];

function generateRandomEmail(name) {
  const domain = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'email.com'][Math.floor(Math.random() * 5)];
  const username = name.toLowerCase().replace(/\s+/g, '.') + Math.floor(Math.random() * 100);
  return `${username}@${domain}`;
}

function generateRandomDateTime(daysOffset, startHour = 9, endHour = 17) {
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + daysOffset);
  
  const hour = Math.floor(Math.random() * (endHour - startHour)) + startHour;
  const minute = Math.random() > 0.5 ? 0 : 30; // Either :00 or :30
  
  targetDate.setHours(hour, minute, 0, 0);
  return targetDate;
}

function generateAppointments(doctors, count = 200) {
  const appointments = [];
  const statuses = ['confirmed', 'completed', 'cancelled'];
  const durations = [30, 60];
  
  for (let appointmentIndex = 0; appointmentIndex < count; appointmentIndex++) {
    const doctor = doctors[Math.floor(Math.random() * doctors.length)];
    const patientName = patientNames[Math.floor(Math.random() * patientNames.length)];
    
    // Generate appointments across different time periods
    // 30% past appointments, 10% today, 60% future appointments
    let daysOffset;
    let status;
    
    const randomValue = Math.random();
    if (randomValue < 0.3) {
      // Past appointments (-30 to -1 days)
      daysOffset = Math.floor(Math.random() * 30) * -1 - 1;
      status = Math.random() > 0.2 ? 'completed' : 'cancelled'; // 80% completed, 20% cancelled
    } else if (randomValue < 0.4) {
      // Today's appointments
      daysOffset = 0;
      status = 'confirmed';
    } else {
      // Future appointments (1 to 60 days)
      daysOffset = Math.floor(Math.random() * 60) + 1;
      status = 'confirmed';
    }
    
    const appointment = {
      doctor_id: doctor.id,
      patient_name: patientName,
      patient_email: generateRandomEmail(patientName),
      date_time: generateRandomDateTime(daysOffset),
      duration_minutes: durations[Math.floor(Math.random() * durations.length)],
      status: status
    };
    
    appointments.push(appointment);
  }
  
  // Sort by date_time for better organization
  appointments.sort((a, b) => a.date_time - b.date_time);
  
  return appointments;
}

function generatePrescriptions(appointments, prescriptionRate = 0.6) {
  const prescriptions = [];
  
  // Only generate prescriptions for completed appointments that have an ID (inserted)
  const completedAppointments = appointments.filter(appointment => appointment.status === 'completed' && appointment.id);
  
  for (const appointment of completedAppointments) {
    // Generate prescription based on rate (60% of completed appointments get prescriptions)
    if (Math.random() < prescriptionRate) {
      const template = medicationTemplates[Math.floor(Math.random() * medicationTemplates.length)];
      
      const prescription = {
        appointment_id: appointment.id,
        doctor_id: appointment.doctor_id,
        patient_name: appointment.patient_name,
        medications: template.medications,
        dosage: template.dosage,
        instructions: template.instructions
      };
      
      prescriptions.push(prescription);
    }
  }
  
  return prescriptions;
}

module.exports = {
  generateAppointments,
  generatePrescriptions,
  patientNames,
  medicationTemplates
};

// If run directly, generate and display sample data
if (require.main === module) {
  console.log('📅 Appointment Generator Test');
  console.log('============================');
  
  // Mock doctor data for testing
  const mockDoctors = [
    { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Dr. Smith', specialty: 'General Practitioner' },
    { id: '123e4567-e89b-12d3-a456-426614174001', name: 'Dr. Johnson', specialty: 'Cardiologist' }
  ];
  
  const appointments = generateAppointments(mockDoctors, 10);
  console.log(`Generated ${appointments.length} appointments:`);
  
  appointments.forEach((appointment, appointmentIndex) => {
    console.log(`${appointmentIndex + 1}. ${appointment.patient_name} with ${mockDoctors.find(doctor => doctor.id === appointment.doctor_id)?.name} on ${appointment.date_time.toISOString()} (${appointment.status})`);
  });
  
  const prescriptions = generatePrescriptions(appointments);
  console.log(`\nGenerated ${prescriptions.length} prescriptions for completed appointments.`);
}