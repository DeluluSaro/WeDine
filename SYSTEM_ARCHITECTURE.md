# WeDine RFID Payment System Architecture

## System Overview
The WeDine RFID Payment System is a comprehensive solution that enables students to pay for food orders using their college ID cards through RFID technology. The system integrates with Razorpay for wallet top-ups and provides real-time payment processing.

## Architecture Components

### 1. Frontend (Next.js)
- **Wallet Page**: User interface for managing digital wallet
- **Orders Page**: Order management with RFID payment options
- **Floating Navbar**: Navigation with wallet balance display

### 2. Backend APIs (Next.js API Routes)
- **Wallet APIs**:
  - `/api/wallet/create` - Create new wallet
  - `/api/wallet/balance` - Get wallet balance
  - `/api/wallet/add-money` - Create Razorpay order
  - `/api/wallet/verify-payment` - Verify Razorpay payment

- **RFID Payment APIs**:
  - `/api/payment/rfid` - Process RFID payments
  - `/api/payment/rfid/enable` - Enable RFID payment mode
  - `/api/payment/rfid/status` - Check payment status

### 3. Database (Sanity CMS)
- **Wallet Schema**: Stores user wallet data and transactions
- **Order Schema**: Manages order information and payment status
- **Food Items**: Product catalog and inventory

### 4. IoT Hardware (ESP8266 + RC522)
- **RFID Reader**: Scans college ID cards
- **Status Indicators**: LEDs and buzzer for user feedback
- **Network Communication**: WiFi connectivity to backend

### 5. Payment Gateway (Razorpay)
- **Wallet Top-up**: Secure money addition to user wallets
- **Payment Verification**: Transaction validation and confirmation

## Data Flow

### Wallet Top-up Process
1. User navigates to wallet page
2. Enters amount to add
3. Frontend calls `/api/wallet/add-money`
4. Backend creates Razorpay order
5. User completes payment on Razorpay
6. Razorpay webhook calls `/api/wallet/verify-payment`
7. Backend updates wallet balance in Sanity
8. Frontend refreshes wallet data

### RFID Payment Process
1. User places order and goes to restaurant
2. User enables RFID payment mode in orders page
3. Frontend calls `/api/payment/rfid/enable`
4. Backend validates order and wallet balance
5. ESP8266 device enters payment mode
6. User scans college ID card on RFID reader
7. ESP8266 sends payment request to `/api/payment/rfid`
8. Backend processes payment and updates wallet
9. Backend updates order payment status
10. Frontend receives payment confirmation

## Security Measures

### 1. Authentication & Authorization
- Clerk authentication for user management
- Email domain validation (VIT students only)
- Session management and token validation

### 2. Payment Security
- Razorpay signature verification
- HMAC-based request signing
- Timestamp validation (prevents replay attacks)
- SSL/TLS encryption for all communications

### 3. RFID Security
- Card-to-user mapping validation
- Device authentication using secret keys
- Payment amount validation
- Transaction logging and audit trail

### 4. Data Protection
- Encrypted data transmission
- Secure API endpoints
- Input validation and sanitization
- Rate limiting and DDoS protection

## Hardware Specifications

### ESP8266 Development Board
- **Model**: NodeMCU or Wemos D1 Mini
- **WiFi**: 802.11 b/g/n
- **Power**: 3.3V/5V
- **GPIO**: 11 digital pins

### RC522 RFID Module
- **Operating Voltage**: 3.3V
- **Communication**: SPI
- **Read Distance**: 0-6cm
- **Frequency**: 13.56MHz

### Status Indicators
- **Green LED**: Success/System Ready
- **Red LED**: Error/Offline
- **Blue LED**: Payment Mode Active
- **Buzzer**: Audio feedback

## Network Architecture

### WiFi Configuration
- Dedicated network for IoT devices
- WPA2/WPA3 encryption
- Network segmentation for security
- Static IP assignment for devices

### API Communication
- RESTful API design
- JSON data format
- HTTP/HTTPS protocols
- WebSocket for real-time updates

## Error Handling

### Frontend Error Handling
- User-friendly error messages
- Retry mechanisms for failed requests
- Offline mode detection
- Loading states and progress indicators

### Backend Error Handling
- Comprehensive error logging
- Graceful degradation
- Transaction rollback on failures
- Health check endpoints

### IoT Error Handling
- Network reconnection logic
- Payment timeout handling
- Device status monitoring
- Error state recovery

## Monitoring & Logging

### Application Monitoring
- Payment transaction logs
- User activity tracking
- System performance metrics
- Error rate monitoring

### Device Monitoring
- Device connectivity status
- Payment success rates
- Hardware health checks
- Network latency monitoring

## Scalability Considerations

### Database Scaling
- Sanity CMS cloud infrastructure
- Data partitioning strategies
- Query optimization
- Caching mechanisms

### API Scaling
- Load balancing
- CDN integration
- Rate limiting
- Caching layers

### IoT Scaling
- Device management system
- Centralized configuration
- Remote firmware updates
- Health monitoring dashboard

## Deployment Architecture

### Frontend Deployment
- Vercel/Netlify hosting
- CDN distribution
- Environment configuration
- CI/CD pipeline

### Backend Deployment
- Serverless functions
- API gateway
- Database hosting
- Monitoring services

### IoT Deployment
- Device provisioning
- Network configuration
- Remote management
- Maintenance scheduling

## Future Enhancements

### Planned Features
- Multi-language support
- Advanced analytics dashboard
- Mobile app development
- Integration with college systems

### Technical Improvements
- Real-time notifications
- Advanced security features
- Performance optimization
- Machine learning integration

## Maintenance & Support

### Regular Maintenance
- System health checks
- Security updates
- Performance monitoring
- User feedback analysis

### Support Structure
- Technical documentation
- User training materials
- Troubleshooting guides
- Contact support system
