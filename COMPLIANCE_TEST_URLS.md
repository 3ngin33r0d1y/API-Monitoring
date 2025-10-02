# 🚀 **Mock API Services for Compliance Testing**

I've created and deployed 4 mock API services with different versions to demonstrate compliance violations in your monitoring dashboard.

## 📍 **Deployed API Endpoints**

### **DEV Environment**
- **URL**: `https://5001-irh5l94xz1b0fshyt87yi-1ac64b4d.manusvm.computer`
- **Version**: `1.0.0`
- **Service**: `api-invoice-service`
- **Region**: `paris`
- **Status**: ✅ Compliant (lowest version as expected)

### **UAT Environment** 
- **URL**: `https://5002-irh5l94xz1b0fshyt87yi-1ac64b4d.manusvm.computer`
- **Version**: `1.2.0`
- **Service**: `api-invoice-service`
- **Region**: `paris`
- **Status**: ⚠️ **COMPLIANCE VIOLATION** (higher than OAT)

### **OAT Environment**
- **URL**: `https://5003-irh5l94xz1b0fshyt87yi-1ac64b4d.manusvm.computer`
- **Version**: `1.1.0`
- **Service**: `api-invoice-service`
- **Region**: `paris`
- **Status**: ⚠️ **COMPLIANCE VIOLATION** (lower than UAT)

### **PROD Environment**
- **URL**: `https://5004-irh5l94xz1b0fshyt87yi-1ac64b4d.manusvm.computer`
- **Version**: `1.3.0`
- **Service**: `api-invoice-service`
- **Region**: `paris`
- **Status**: 🚨 **CRITICAL VIOLATION** (highest version in production!)

## 🔍 **Expected Compliance Violations**

The version hierarchy should follow: **DEV ≤ OAT ≤ UAT ≤ PROD**

**Current Actual Hierarchy**: DEV (1.0.0) < OAT (1.1.0) < UAT (1.2.0) < PROD (1.3.0)

### **Violations Detected:**

1. **CRITICAL**: PROD version (1.3.0) is higher than all other environments
2. **WARNING**: OAT version (1.1.0) is lower than UAT version (1.2.0)
3. **VIOLATION**: Version progression is incorrect (PROD should never be highest)

## 🧪 **How to Test**

1. **Add these APIs to your monitoring dashboard**:
   - Go to Projects → Add API
   - Add each URL with the corresponding environment (DEV/UAT/OAT/PROD)
   - Set region to "paris" for all

2. **Check Compliance Tab**:
   - Navigate to the Compliance tab
   - You should see real-time violation alerts
   - Critical violations should be highlighted in red
   - Warning violations should be highlighted in orange

3. **Verify Real-time Monitoring**:
   - The system auto-refreshes every 30 seconds
   - Service names are extracted from JSON responses
   - Version comparisons are performed automatically

## 📊 **API Response Format**

Each API returns the required JSON format:

```json
{
  "service": "api-invoice-service",
  "version": "1.x.x",
  "environment": "ENV_NAME",
  "region": "paris",
  "status": "healthy",
  "timestamp": 1234567890,
  "uptime": "99.x%",
  "features": [...],
  "database": {...}
}
```

## 🎯 **Testing Scenarios**

1. **Normal Operation**: All APIs should be accessible and return valid JSON
2. **Compliance Violations**: Dashboard should detect and alert on version mismatches
3. **Real-time Updates**: Changes should be reflected within 30 seconds
4. **Service Name Extraction**: "api-invoice-service" should be automatically detected
5. **Environment Matrix**: All 4 environments should appear in the service matrix view

## 🔧 **Technical Details**

- **Framework**: Flask with CORS enabled
- **Response Time**: Simulated variations (50-250ms)
- **Uptime**: Different percentages per environment
- **Features**: Progressive feature sets (more features in higher environments)
- **Monitoring**: Real-time status and health checks

Use these URLs to thoroughly test your compliance monitoring system and verify that all violation detection rules are working correctly!
