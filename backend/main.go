package main

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

type Doctor struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Specialty    string  `json:"specialty"`
	Location     string  `json:"location"`
	Rating       float64 `json:"rating"`
	PricePerHour int     `json:"price_per_hour"`
	Avatar       string  `json:"avatar"`
	Experience   int     `json:"experience_years"`
	Languages    string  `json:"languages"`
}

type Appointment struct {
	ID        string    `json:"id"`
	DoctorID  string    `json:"doctor_id"`
	PatientName string  `json:"patient_name"`
	PatientEmail string `json:"patient_email"`
	DateTime  time.Time `json:"date_time"`
	Duration  int       `json:"duration_minutes"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateAppointmentRequest struct {
	DoctorID     string `json:"doctor_id" binding:"required"`
	PatientName  string `json:"patient_name" binding:"required"`
	PatientEmail string `json:"patient_email" binding:"required"`
	DateTime     string `json:"date_time" binding:"required"`
	Duration     int    `json:"duration_minutes" binding:"required"`
}

type Prescription struct {
	ID            string    `json:"id"`
	AppointmentID string    `json:"appointment_id"`
	DoctorID      string    `json:"doctor_id"`
	PatientName   string    `json:"patient_name"`
	Medications   string    `json:"medications"`
	Dosage        string    `json:"dosage"`
	Instructions  string    `json:"instructions"`
	CreatedAt     time.Time `json:"created_at"`
}

type CreatePrescriptionRequest struct {
	AppointmentID string `json:"appointment_id" binding:"required"`
	Medications   string `json:"medications" binding:"required"`
	Dosage        string `json:"dosage" binding:"required"`
	Instructions  string `json:"instructions"`
}

type AppointmentWithPatientAndPrescription struct {
	ID            string        `json:"id"`
	DoctorID      string        `json:"doctor_id"`
	PatientName   string        `json:"patient_name"`
	PatientEmail  string        `json:"patient_email"`
	DateTime      time.Time     `json:"date_time"`
	Duration      int           `json:"duration_minutes"`
	Status        string        `json:"status"`
	CreatedAt     time.Time     `json:"created_at"`
	Prescription  *Prescription `json:"prescription,omitempty"`
}

type MedicalFile struct {
	ID          string    `json:"id"`
	PatientID   string    `json:"patient_id"`
	PatientName string    `json:"patient_name"`
	FileName    string    `json:"file_name"`
	FileType    string    `json:"file_type"`
	FileSize    int64     `json:"file_size"`
	S3Key       string    `json:"s3_key"`
	S3URL       string    `json:"s3_url,omitempty"`
	Category    string    `json:"category"`
	UploadedAt  time.Time `json:"uploaded_at"`
}

type FileUploadResponse struct {
	FileID     string `json:"file_id"`
	FileName   string `json:"file_name"`
	FileSize   int64  `json:"file_size"`
	S3Key      string `json:"s3_key"`
	Category   string `json:"category"`
	UploadedAt time.Time `json:"uploaded_at"`
	Message    string `json:"message"`
}

var databaseConnection *sql.DB
var s3StorageClient *s3.Client

func initDB() {
	var err error
	databaseURL := os.Getenv("DATABASE_URL")
	
	// Default local development configuration
	if databaseURL == "" {
		databaseURL = "postgres://doktolib:password123@localhost:5432/doktolib?sslmode=disable"
	} else {
		// Configure SSL mode based on environment variables
		databaseURL = configureSSLMode(databaseURL)
	}

	log.Printf("Connecting to database with URL: %s", maskPassword(databaseURL))

	databaseConnection, err = sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	if err = databaseConnection.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	log.Println("Successfully connected to database")
}

func initS3() {
	awsRegion := os.Getenv("AWS_REGION")
	if awsRegion == "" {
		awsRegion = "us-east-1"
	}

	awsAccessKeyID := os.Getenv("AWS_ACCESS_KEY_ID")
	awsSecretAccessKey := os.Getenv("AWS_SECRET_ACCESS_KEY")

	if awsAccessKeyID == "" || awsSecretAccessKey == "" {
		log.Println("Warning: AWS credentials not found. S3 file upload will not work.")
		return
	}

	awsConfig, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(awsRegion),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			awsAccessKeyID,
			awsSecretAccessKey,
			"",
		)),
	)

	if err != nil {
		log.Printf("Warning: Failed to load AWS config: %v", err)
		return
	}

	s3StorageClient = s3.NewFromConfig(awsConfig)
	log.Printf("Successfully initialized S3 client for region: %s", awsRegion)
}

// configureSSLMode adds or modifies SSL configuration in the database URL
func configureSSLMode(databaseURL string) string {
	sslMode := os.Getenv("DB_SSL_MODE")
	if sslMode == "" {
		sslMode = "require" // Default to require for RDS Aurora and managed databases
	}

	// Parse the URL
	parsedURL, err := url.Parse(databaseURL)
	if err != nil {
		log.Printf("Warning: Could not parse DATABASE_URL, using as-is: %v", err)
		return databaseURL
	}

	// Get existing query parameters
	queryParams := parsedURL.Query()
	
	// Set or update sslmode
	queryParams.Set("sslmode", sslMode)
	
	// Add additional SSL parameters if needed
	if sslMode != "disable" {
		// Set SSL cert configuration if provided
		if sslCert := os.Getenv("DB_SSL_CERT"); sslCert != "" {
			queryParams.Set("sslcert", sslCert)
		}
		if sslKey := os.Getenv("DB_SSL_KEY"); sslKey != "" {
			queryParams.Set("sslkey", sslKey)
		}
		if sslRootCert := os.Getenv("DB_SSL_ROOT_CERT"); sslRootCert != "" {
			queryParams.Set("sslrootcert", sslRootCert)
		}
	}

	// Rebuild the URL
	parsedURL.RawQuery = queryParams.Encode()
	return parsedURL.String()
}

func validateFileType(fileName string) (string, bool) {
	ext := strings.ToLower(filepath.Ext(fileName))
	allowedTypes := map[string]string{
		".pdf":  "application/pdf",
		".jpg":  "image/jpeg",
		".jpeg": "image/jpeg",
		".png":  "image/png",
		".gif":  "image/gif",
		".doc":  "application/msword",
		".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		".txt":  "text/plain",
	}

	if contentType, ok := allowedTypes[ext]; ok {
		return contentType, true
	}
	return "", false
}

func categorizeFile(fileName string) string {
	name := strings.ToLower(fileName)
	if strings.Contains(name, "lab") || strings.Contains(name, "test") || strings.Contains(name, "result") {
		return "lab_results"
	}
	if strings.Contains(name, "insurance") || strings.Contains(name, "card") || strings.Contains(name, "coverage") {
		return "insurance"
	}
	if strings.Contains(name, "prescription") || strings.Contains(name, "rx") || strings.Contains(name, "medication") {
		return "prescription"
	}
	if strings.Contains(name, "medical") || strings.Contains(name, "history") || strings.Contains(name, "record") {
		return "medical_records"
	}
	return "other"
}

func uploadFileToS3(file multipart.File, fileName string, contentType string, patientID string, category string) (string, error) {
	if s3StorageClient == nil {
		return "", fmt.Errorf("S3 client not initialized")
	}

	bucketName := os.Getenv("AWS_S3_BUCKET")
	if bucketName == "" {
		return "", fmt.Errorf("AWS_S3_BUCKET environment variable not set")
	}

	// Create unique S3 key
	fileID := uuid.New().String()
	extension := filepath.Ext(fileName)
	s3Key := fmt.Sprintf("medical-files/%s/%s/%s%s", category, patientID, fileID, extension)

	// Read file content
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %v", err)
	}

	// Upload to S3
	_, err = s3StorageClient.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:        aws.String(bucketName),
		Key:           aws.String(s3Key),
		Body:          bytes.NewReader(fileBytes),
		ContentType:   aws.String(contentType),
		ContentLength: aws.Int64(int64(len(fileBytes))),
		ServerSideEncryption: "AES256",
		Metadata: map[string]string{
			"patient-id":   patientID,
			"category":     category,
			"original-name": fileName,
		},
	})

	if err != nil {
		return "", fmt.Errorf("failed to upload to S3: %v", err)
	}

	return s3Key, nil
}

func generatePresignedURL(s3Key string, expiration time.Duration) (string, error) {
	if s3StorageClient == nil {
		return "", fmt.Errorf("S3 client not initialized")
	}

	bucketName := os.Getenv("AWS_S3_BUCKET")
	if bucketName == "" {
		return "", fmt.Errorf("AWS_S3_BUCKET environment variable not set")
	}

	presignClient := s3.NewPresignClient(s3StorageClient)
	request, err := presignClient.PresignGetObject(context.TODO(), &s3.GetObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(s3Key),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = expiration
	})

	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %v", err)
	}

	return request.URL, nil
}

// maskPassword hides the password in database URL for logging
func maskPassword(databaseURL string) string {
	parsedURL, err := url.Parse(databaseURL)
	if err != nil {
		return databaseURL
	}
	
	if parsedURL.User != nil && parsedURL.User.Username() != "" {
		if _, hasPassword := parsedURL.User.Password(); hasPassword {
			parsedURL.User = url.UserPassword(parsedURL.User.Username(), "***")
		}
	}
	
	return parsedURL.String()
}

func getDoctors(c *gin.Context) {
	specialty := c.Query("specialty")
	location := c.Query("location")

	query := `
		SELECT id, name, specialty, location, rating, price_per_hour, avatar, experience_years, languages 
		FROM doctors 
		WHERE 1=1
	`
	args := []interface{}{}
	argCount := 0

	if specialty != "" {
		argCount++
		query += fmt.Sprintf(" AND LOWER(specialty) LIKE LOWER($%d)", argCount)
		args = append(args, "%"+specialty+"%")
	}

	if location != "" {
		argCount++
		query += fmt.Sprintf(" AND LOWER(location) LIKE LOWER($%d)", argCount)
		args = append(args, "%"+location+"%")
	}

	query += " ORDER BY rating DESC, name ASC"

	rows, err := databaseConnection.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch doctors"})
		return
	}
	defer rows.Close()

	var doctors []Doctor
	for rows.Next() {
		var doctor Doctor
		err := rows.Scan(
			&doctor.ID, &doctor.Name, &doctor.Specialty, &doctor.Location,
			&doctor.Rating, &doctor.PricePerHour, &doctor.Avatar,
			&doctor.Experience, &doctor.Languages,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan doctor"})
			return
		}
		doctors = append(doctors, doctor)
	}

	c.JSON(http.StatusOK, doctors)
}

func getDoctorByID(c *gin.Context) {
	id := c.Param("id")

	query := `
		SELECT id, name, specialty, location, rating, price_per_hour, avatar, experience_years, languages 
		FROM doctors 
		WHERE id = $1
	`

	var doctor Doctor
	err := databaseConnection.QueryRow(query, id).Scan(
		&doctor.ID, &doctor.Name, &doctor.Specialty, &doctor.Location,
		&doctor.Rating, &doctor.PricePerHour, &doctor.Avatar,
		&doctor.Experience, &doctor.Languages,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Doctor not found"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch doctor"})
		return
	}

	c.JSON(http.StatusOK, doctor)
}

func createAppointment(c *gin.Context) {
	var req CreateAppointmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	appointmentTime, err := time.Parse("2006-01-02T15:04:05Z", req.DateTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	if appointmentTime.Before(time.Now()) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot book appointments in the past"})
		return
	}

	appointmentID := uuid.New().String()

	query := `
		INSERT INTO appointments (id, doctor_id, patient_name, patient_email, date_time, duration_minutes, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, doctor_id, patient_name, patient_email, date_time, duration_minutes, status, created_at
	`

	var appointment Appointment
	err = databaseConnection.QueryRow(
		query,
		appointmentID,
		req.DoctorID,
		req.PatientName,
		req.PatientEmail,
		appointmentTime,
		req.Duration,
		"confirmed",
		time.Now(),
	).Scan(
		&appointment.ID,
		&appointment.DoctorID,
		&appointment.PatientName,
		&appointment.PatientEmail,
		&appointment.DateTime,
		&appointment.Duration,
		&appointment.Status,
		&appointment.CreatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create appointment"})
		return
	}

	c.JSON(http.StatusCreated, appointment)
}

func getAppointments(c *gin.Context) {
	doctorID := c.Query("doctor_id")
	
	query := `
		SELECT a.id, a.doctor_id, a.patient_name, a.patient_email, a.date_time, a.duration_minutes, a.status, a.created_at
		FROM appointments a
		WHERE 1=1
	`
	args := []interface{}{}
	
	if doctorID != "" {
		query += " AND a.doctor_id = $1"
		args = append(args, doctorID)
	}
	
	query += " ORDER BY a.date_time ASC"

	rows, err := databaseConnection.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch appointments"})
		return
	}
	defer rows.Close()

	var appointments []Appointment
	for rows.Next() {
		var appointment Appointment
		err := rows.Scan(
			&appointment.ID,
			&appointment.DoctorID,
			&appointment.PatientName,
			&appointment.PatientEmail,
			&appointment.DateTime,
			&appointment.Duration,
			&appointment.Status,
			&appointment.CreatedAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan appointment"})
			return
		}
		appointments = append(appointments, appointment)
	}

	c.JSON(http.StatusOK, appointments)
}

func getDoctorAppointments(c *gin.Context) {
	doctorID := c.Param("doctorId")
	filter := c.Query("filter") // "past", "today", "future"
	
	query := `
		SELECT a.id, a.doctor_id, a.patient_name, a.patient_email, a.date_time, a.duration_minutes, a.status, a.created_at,
		       p.id, p.medications, p.dosage, p.instructions, p.created_at
		FROM appointments a
		LEFT JOIN prescriptions p ON a.id = p.appointment_id
		WHERE a.doctor_id = $1
	`
	
	// Add date filtering
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	tomorrow := today.AddDate(0, 0, 1)
	
	switch filter {
	case "past":
		query += " AND a.date_time < $2"
	case "today":
		query += " AND a.date_time >= $2 AND a.date_time < $3"
	case "future":
		query += " AND a.date_time >= $2"
	}
	
	query += " ORDER BY a.date_time DESC"
	
	var rows *sql.Rows
	var err error
	
	switch filter {
	case "past":
		rows, err = databaseConnection.Query(query, doctorID, today)
	case "today":
		rows, err = databaseConnection.Query(query, doctorID, today, tomorrow)
	case "future":
		rows, err = databaseConnection.Query(query, doctorID, tomorrow)
	default:
		rows, err = databaseConnection.Query(query[:len(query)-25]+" ORDER BY a.date_time DESC", doctorID) // Remove WHERE clause
	}
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch appointments"})
		return
	}
	defer rows.Close()

	var appointments []AppointmentWithPatientAndPrescription
	for rows.Next() {
		var appointment AppointmentWithPatientAndPrescription
		var prescriptionID sql.NullString
		var medications sql.NullString
		var dosage sql.NullString
		var instructions sql.NullString
		var prescriptionCreatedAt sql.NullTime
		
		err := rows.Scan(
			&appointment.ID,
			&appointment.DoctorID,
			&appointment.PatientName,
			&appointment.PatientEmail,
			&appointment.DateTime,
			&appointment.Duration,
			&appointment.Status,
			&appointment.CreatedAt,
			&prescriptionID,
			&medications,
			&dosage,
			&instructions,
			&prescriptionCreatedAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan appointment"})
			return
		}
		
		// Add prescription if exists
		if prescriptionID.Valid {
			appointment.Prescription = &Prescription{
				ID:            prescriptionID.String,
				AppointmentID: appointment.ID,
				DoctorID:      appointment.DoctorID,
				PatientName:   appointment.PatientName,
				Medications:   medications.String,
				Dosage:        dosage.String,
				Instructions:  instructions.String,
				CreatedAt:     prescriptionCreatedAt.Time,
			}
		}
		
		appointments = append(appointments, appointment)
	}

	c.JSON(http.StatusOK, appointments)
}

func createPrescription(c *gin.Context) {
	var req CreatePrescriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify appointment exists and get doctor and patient info
	var appointment Appointment
	err := databaseConnection.QueryRow(`
		SELECT id, doctor_id, patient_name, patient_email, date_time, duration_minutes, status, created_at
		FROM appointments WHERE id = $1
	`, req.AppointmentID).Scan(
		&appointment.ID, &appointment.DoctorID, &appointment.PatientName,
		&appointment.PatientEmail, &appointment.DateTime, &appointment.Duration,
		&appointment.Status, &appointment.CreatedAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Appointment not found"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch appointment"})
		return
	}

	prescriptionID := uuid.New().String()

	query := `
		INSERT INTO prescriptions (id, appointment_id, doctor_id, patient_name, medications, dosage, instructions, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, appointment_id, doctor_id, patient_name, medications, dosage, instructions, created_at
	`

	var prescription Prescription
	err = databaseConnection.QueryRow(
		query,
		prescriptionID,
		req.AppointmentID,
		appointment.DoctorID,
		appointment.PatientName,
		req.Medications,
		req.Dosage,
		req.Instructions,
		time.Now(),
	).Scan(
		&prescription.ID,
		&prescription.AppointmentID,
		&prescription.DoctorID,
		&prescription.PatientName,
		&prescription.Medications,
		&prescription.Dosage,
		&prescription.Instructions,
		&prescription.CreatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create prescription"})
		return
	}

	c.JSON(http.StatusCreated, prescription)
}

func getDoctorPrescriptions(c *gin.Context) {
	doctorID := c.Param("doctorId")
	patientName := c.Query("patient")
	medication := c.Query("medication")
	
	query := `
		SELECT p.id, p.appointment_id, p.doctor_id, p.patient_name, p.medications, p.dosage, p.instructions, p.created_at,
		       a.date_time, a.duration_minutes, a.status
		FROM prescriptions p
		LEFT JOIN appointments a ON p.appointment_id = a.id
		WHERE p.doctor_id = $1
	`
	args := []interface{}{doctorID}
	argCount := 1
	
	if patientName != "" {
		argCount++
		query += fmt.Sprintf(" AND LOWER(p.patient_name) LIKE LOWER($%d)", argCount)
		args = append(args, "%"+patientName+"%")
	}
	
	if medication != "" {
		argCount++
		query += fmt.Sprintf(" AND LOWER(p.medications) LIKE LOWER($%d)", argCount)
		args = append(args, "%"+medication+"%")
	}
	
	query += " ORDER BY p.created_at DESC"
	
	rows, err := databaseConnection.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch prescriptions"})
		return
	}
	defer rows.Close()

	type PrescriptionWithAppointment struct {
		ID            string    `json:"id"`
		AppointmentID string    `json:"appointment_id"`
		DoctorID      string    `json:"doctor_id"`
		PatientName   string    `json:"patient_name"`
		Medications   string    `json:"medications"`
		Dosage        string    `json:"dosage"`
		Instructions  string    `json:"instructions"`
		CreatedAt     time.Time `json:"created_at"`
		AppointmentDate time.Time `json:"appointment_date"`
		AppointmentDuration int   `json:"appointment_duration"`
		AppointmentStatus string  `json:"appointment_status"`
	}

	var prescriptions []PrescriptionWithAppointment
	for rows.Next() {
		var prescription PrescriptionWithAppointment
		err := rows.Scan(
			&prescription.ID,
			&prescription.AppointmentID,
			&prescription.DoctorID,
			&prescription.PatientName,
			&prescription.Medications,
			&prescription.Dosage,
			&prescription.Instructions,
			&prescription.CreatedAt,
			&prescription.AppointmentDate,
			&prescription.AppointmentDuration,
			&prescription.AppointmentStatus,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan prescription"})
			return
		}
		prescriptions = append(prescriptions, prescription)
	}

	c.JSON(http.StatusOK, prescriptions)
}

func uploadMedicalFile(c *gin.Context) {
	patientID := c.PostForm("patient_id")
	patientName := c.PostForm("patient_name")

	if patientID == "" || patientName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "patient_id and patient_name are required"})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to get file from request"})
		return
	}
	defer file.Close()

	// Validate file size (max 10MB)
	const maxFileSize = 10 * 1024 * 1024
	if header.Size > maxFileSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size exceeds 10MB limit"})
		return
	}

	// Validate file type
	contentType, isValid := validateFileType(header.Filename)
	if !isValid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File type not allowed. Supported: PDF, JPG, PNG, GIF, DOC, DOCX, TXT"})
		return
	}

	// Categorize file
	category := categorizeFile(header.Filename)

	// Upload to S3
	s3Key, err := uploadFileToS3(file, header.Filename, contentType, patientID, category)
	if err != nil {
		log.Printf("S3 upload error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload file"})
		return
	}

	// Save file metadata to database
	fileID := uuid.New().String()
	query := `
		INSERT INTO medical_files (id, patient_id, patient_name, file_name, file_type, file_size, s3_key, category, uploaded_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, patient_id, patient_name, file_name, file_type, file_size, s3_key, category, uploaded_at
	`

	var medicalFile MedicalFile
	err = databaseConnection.QueryRow(
		query,
		fileID,
		patientID,
		patientName,
		header.Filename,
		contentType,
		header.Size,
		s3Key,
		category,
		time.Now(),
	).Scan(
		&medicalFile.ID,
		&medicalFile.PatientID,
		&medicalFile.PatientName,
		&medicalFile.FileName,
		&medicalFile.FileType,
		&medicalFile.FileSize,
		&medicalFile.S3Key,
		&medicalFile.Category,
		&medicalFile.UploadedAt,
	)

	if err != nil {
		log.Printf("Database error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file metadata"})
		return
	}

	// Generate response
	response := FileUploadResponse{
		FileID:     medicalFile.ID,
		FileName:   medicalFile.FileName,
		FileSize:   medicalFile.FileSize,
		S3Key:      medicalFile.S3Key,
		Category:   medicalFile.Category,
		UploadedAt: medicalFile.UploadedAt,
		Message:    "File uploaded successfully",
	}

	c.JSON(http.StatusCreated, response)
}

func getMedicalFiles(c *gin.Context) {
	patientID := c.Query("patient_id")
	category := c.Query("category")

	query := `
		SELECT id, patient_id, patient_name, file_name, file_type, file_size, s3_key, category, uploaded_at
		FROM medical_files
		WHERE 1=1
	`
	args := []interface{}{}
	argCount := 0

	if patientID != "" {
		argCount++
		query += fmt.Sprintf(" AND patient_id = $%d", argCount)
		args = append(args, patientID)
	}

	if category != "" {
		argCount++
		query += fmt.Sprintf(" AND category = $%d", argCount)
		args = append(args, category)
	}

	query += " ORDER BY uploaded_at DESC"

	rows, err := databaseConnection.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch medical files"})
		return
	}
	defer rows.Close()

	var files []MedicalFile
	for rows.Next() {
		var file MedicalFile
		err := rows.Scan(
			&file.ID,
			&file.PatientID,
			&file.PatientName,
			&file.FileName,
			&file.FileType,
			&file.FileSize,
			&file.S3Key,
			&file.Category,
			&file.UploadedAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan medical file"})
			return
		}

		// Generate presigned URL for file access (valid for 1 hour)
		presignedURL, err := generatePresignedURL(file.S3Key, time.Hour)
		if err != nil {
			log.Printf("Warning: Failed to generate presigned URL for %s: %v", file.S3Key, err)
		} else {
			file.S3URL = presignedURL
		}

		files = append(files, file)
	}

	c.JSON(http.StatusOK, files)
}

func deleteMedicalFile(c *gin.Context) {
	fileID := c.Param("fileId")

	// Get file info from database first
	var file MedicalFile
	err := databaseConnection.QueryRow(
		"SELECT id, patient_id, patient_name, file_name, file_type, file_size, s3_key, category, uploaded_at FROM medical_files WHERE id = $1",
		fileID,
	).Scan(
		&file.ID,
		&file.PatientID,
		&file.PatientName,
		&file.FileName,
		&file.FileType,
		&file.FileSize,
		&file.S3Key,
		&file.Category,
		&file.UploadedAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch file info"})
		return
	}

	// Delete from S3
	if s3StorageClient != nil {
		bucketName := os.Getenv("AWS_S3_BUCKET")
		if bucketName != "" {
			_, err = s3StorageClient.DeleteObject(context.TODO(), &s3.DeleteObjectInput{
				Bucket: aws.String(bucketName),
				Key:    aws.String(file.S3Key),
			})
			if err != nil {
				log.Printf("Warning: Failed to delete file from S3: %v", err)
			}
		}
	}

	// Delete from database
	_, err = databaseConnection.Exec("DELETE FROM medical_files WHERE id = $1", fileID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete file from database"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "File deleted successfully",
		"file_id": fileID,
	})
}

func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "healthy",
		"timestamp": time.Now(),
		"service": "doktolib-backend",
	})
}

func main() {
	godotenv.Load()
	
	initDB()
	defer databaseConnection.Close()

	initS3()

	gin.SetMode(gin.ReleaseMode)
	router := gin.Default()

	corsConfig := cors.DefaultConfig()
	corsConfig.AllowAllOrigins = true
	corsConfig.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	router.Use(cors.New(corsConfig))

	api := router.Group("/api/v1")
	{
		api.GET("/health", healthCheck)
		api.GET("/doctors", getDoctors)
		api.GET("/doctors/:id", getDoctorByID)
		api.POST("/appointments", createAppointment)
		api.GET("/appointments", getAppointments)
		api.GET("/appointments/doctor/:doctorId", getDoctorAppointments)
		api.POST("/prescriptions", createPrescription)
		api.GET("/prescriptions/doctor/:doctorId", getDoctorPrescriptions)
		
		// File upload endpoints
		api.POST("/files/upload", uploadMedicalFile)
		api.GET("/files", getMedicalFiles)
		api.DELETE("/files/:fileId", deleteMedicalFile)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}