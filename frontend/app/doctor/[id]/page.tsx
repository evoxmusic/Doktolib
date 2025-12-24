'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import Image from 'next/image'
import DoctorAvatar from '../../../components/DoctorAvatar'
import toast from 'react-hot-toast'
import { 
  ArrowLeftIcon, 
  MapPinIcon, 
  StarIcon, 
  ClockIcon, 
  LanguageIcon,
  AcademicCapIcon 
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid'
import { format, addDays, startOfToday, isAfter, isBefore, endOfDay } from 'date-fns'
import { enUS } from 'date-fns/locale'

interface Doctor {
  id: string
  name: string
  specialty: string
  location: string
  rating: number
  price_per_hour: number
  avatar: string
  experience_years: number
  languages: string
}

interface BookingForm {
  patient_name: string
  patient_email: string
  date_time: string
  duration_minutes: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export default function DoctorDetail() {
  const params = useParams()
  const router = useRouter()
  const doctorId = params.id as string
  
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBooking, setShowBooking] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    patient_name: '',
    patient_email: '',
    date_time: '',
    duration_minutes: 30
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchDoctor = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/api/v1/doctors/${doctorId}`)
      setDoctor(response.data)
    } catch (error) {
      console.error('Error fetching doctor:', error)
      toast.error('Error loading doctor')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (doctorId) {
      fetchDoctor()
    }
  }, [doctorId]) // eslint-disable-line react-hooks/exhaustive-deps

  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    
    for (let starIndex = 0; starIndex < fullStars; starIndex++) {
      stars.push(
        <StarSolidIcon key={starIndex} className="h-5 w-5 text-yellow-400" />
      )
    }
    
    const emptyStars = 5 - fullStars
    for (let emptyStarIndex = 0; emptyStarIndex < emptyStars; emptyStarIndex++) {
      stars.push(
        <StarIcon key={`empty-${emptyStarIndex}`} className="h-5 w-5 text-gray-300" />
      )
    }
    
    return stars
  }

  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(timeString)
      }
    }
    return slots
  }

  const getAvailableDates = () => {
    const dates = []
    const today = startOfToday()
    
    for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
      const date = addDays(today, dayOffset)
      dates.push(date)
    }
    
    return dates
  }

  const handleDateTimeSelection = (date: Date, time: string) => {
    setSelectedDate(date)
    setSelectedTime(time)
    
    const dateTimeString = `${format(date, 'yyyy-MM-dd')}T${time}:00Z`
    setBookingForm({
      ...bookingForm,
      date_time: dateTimeString
    })
  }

  const handleBookingSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    
    if (!selectedDate || !selectedTime || !bookingForm.patient_name || !bookingForm.patient_email) {
      toast.error('Please fill in all fields')
      return
    }

    setSubmitting(true)
    
    try {
      const bookingData = {
        ...bookingForm,
        doctor_id: doctorId
      }
      
      await axios.post(`${API_URL}/api/v1/appointments`, bookingData)
      toast.success('Appointment confirmed!')
      
      setTimeout(() => {
        router.push('/')
      }, 2000)
      
    } catch (error) {
      console.error('Error booking appointment:', error)
      toast.error('Error during booking')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-doctolib-blue"></div>
      </div>
    )
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Doctor not found</h2>
          <button onClick={() => router.push('/')} className="btn-primary">
            Back to home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <button
              onClick={() => router.push('/')}
              className="flex items-center text-gray-600 hover:text-doctolib-darkblue mr-6"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back
            </button>
            <h1 className="text-3xl font-bold text-doctolib-darkblue">Doktolib</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Doctor Info */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex items-start space-x-6 mb-6">
                <DoctorAvatar
                  src={doctor.avatar}
                  alt={doctor.name}
                  width={120}
                  height={120}
                  className="rounded-full object-cover"
                />
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{doctor.name}</h2>
                  <p className="text-xl text-doctolib-darkblue font-semibold mb-4">{doctor.specialty}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <MapPinIcon className="h-5 w-5 mr-2" />
                      {doctor.location}
                    </div>
                    <div className="flex items-center">
                      <AcademicCapIcon className="h-5 w-5 mr-2" />
                      {doctor.experience_years} years of experience
                    </div>
                    <div className="flex items-center">
                      <LanguageIcon className="h-5 w-5 mr-2" />
                      {doctor.languages}
                    </div>
                    <div className="flex items-center">
                      <ClockIcon className="h-5 w-5 mr-2" />
                      ${doctor.price_per_hour} / consultation
                    </div>
                  </div>
                  
                  <div className="flex items-center mt-4">
                    <div className="flex items-center space-x-1 mr-3">
                      {renderStars(doctor.rating)}
                    </div>
                    <span className="text-lg font-semibold text-gray-700">
                      {doctor.rating}/5
                    </span>
                  </div>
                </div>
              </div>
              
              {!showBooking ? (
                <button
                  onClick={() => setShowBooking(true)}
                  className="btn-primary w-full text-lg py-3"
                >
                  Book appointment
                </button>
              ) : (
                <div className="border-t pt-6">
                  <h3 className="text-xl font-semibold mb-4">Book an appointment</h3>
                  
                  {/* Date Selection */}
                  <div className="mb-6">
                    <h4 className="font-medium mb-3">Choose a date</h4>
                    <div className="grid grid-cols-7 gap-2">
                      {getAvailableDates().map((date) => (
                        <button
                          key={date.toISOString()}
                          onClick={() => setSelectedDate(date)}
                          className={`p-2 text-sm rounded-lg border ${
                            selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                              ? 'bg-doctolib-blue text-white border-doctolib-blue'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-doctolib-blue'
                          }`}
                        >
                          <div className="font-medium">{format(date, 'EEE', { locale: enUS })}</div>
                          <div>{format(date, 'd')}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Time Selection */}
                  {selectedDate && (
                    <div className="mb-6">
                      <h4 className="font-medium mb-3">Choose a time</h4>
                      <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                        {generateTimeSlots().map((time) => (
                          <button
                            key={time}
                            onClick={() => handleDateTimeSelection(selectedDate, time)}
                            className={`p-2 text-sm rounded-lg border ${
                              selectedTime === time
                                ? 'bg-doctolib-blue text-white border-doctolib-blue'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-doctolib-blue'
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Patient Info Form */}
                  {selectedDate && selectedTime && (
                    <form onSubmit={handleBookingSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="patient_name" className="block text-sm font-medium text-gray-700 mb-1">
                          Full name *
                        </label>
                        <input
                          type="text"
                          id="patient_name"
                          required
                          className="input-field"
                          value={bookingForm.patient_name}
                          onChange={(event) => setBookingForm({...bookingForm, patient_name: event.target.value})}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="patient_email" className="block text-sm font-medium text-gray-700 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          id="patient_email"
                          required
                          className="input-field"
                          value={bookingForm.patient_email}
                          onChange={(event) => setBookingForm({...bookingForm, patient_email: event.target.value})}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                          Consultation duration
                        </label>
                        <select
                          id="duration"
                          className="input-field"
                          value={bookingForm.duration_minutes}
                          onChange={(event) => setBookingForm({...bookingForm, duration_minutes: parseInt(event.target.value)})}
                        >
                          <option value={30}>30 minutes</option>
                          <option value={60}>1 hour</option>
                        </select>
                      </div>
                      
                      <div className="flex space-x-4 pt-4">
                        <button
                          type="button"
                          onClick={() => setShowBooking(false)}
                          className="btn-secondary flex-1"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="btn-primary flex-1 disabled:opacity-50"
                        >
                          {submitting ? 'Confirming...' : 'Confirm appointment'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Practical information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Rate:</span> ${doctor.price_per_hour}
                </div>
                <div>
                  <span className="font-medium">Duration:</span> 30-60 minutes
                </div>
                <div>
                  <span className="font-medium">Payment:</span> Cash, Card, Check
                </div>
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Access and contact</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Address:</span><br />
                  {doctor.location}
                </div>
                <div>
                  <span className="font-medium">Access:</span><br />
                  Metro, Bus, Parking
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}