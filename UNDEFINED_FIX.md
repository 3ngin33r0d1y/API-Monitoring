# Fix for "undefined%" Issue in Dashboard

## **Problem Identified**

The "undefined%" values appearing in the System Uptime and Compliance metric cards were caused by missing property definitions in the `enhancedMetrics` object in the Dashboard component.

## **Root Cause**

The Dashboard component was trying to access `enhancedMetrics.uptimePercent` and `enhancedMetrics.compliancePercent` properties that were not being calculated or returned from the `enhancedMetrics` computation.

## **Solution Applied**

### **File Updated:** `frontend/src/ui/tabs/Dashboard.tsx`

**Added proper calculations for missing metrics:**

```typescript
// Calculate uptime percentage
const uptimePercent = filtered.length > 0 ? Math.round((onlineApis.length / filtered.length) * 100) : 0;

// Calculate compliance percentage (mock calculation - you can enhance this based on your compliance rules)
const compliancePercent = filtered.length > 0 ? Math.round(metrics.overallScore) : 0;

return {
  ...metrics,
  avgResponseTime: Math.round(avgResponseTime),
  onlineCount: onlineApis.length,
  offlineCount: offlineApis.length,
  uptimePercent,           // ← Added this
  compliancePercent,       // ← Added this
  envDistribution: Object.entries(envDistribution).map(([name, value]) => ({ name, value })),
  regionDistribution: Object.entries(regionDistribution).map(([name, value]) => ({ name, value })),
  responseTimeTrends
};
```

**Added null safety to MetricCard values:**

```typescript
<MetricCard
  title="System Uptime"
  value={`${enhancedMetrics.uptimePercent || 0}%`}  // ← Added || 0 fallback
  // ...
/>
<MetricCard
  title="Compliance"
  value={`${enhancedMetrics.compliancePercent || 0}%`}  // ← Added || 0 fallback
  // ...
/>
```

## **Result**

- **System Uptime** now shows the actual percentage of online APIs (e.g., "100%" if all APIs are online)
- **Compliance** now shows the overall compliance score based on HTTPS usage, response times, and availability
- No more "undefined%" values in the dashboard
- Proper fallback values (0) when no data is available

## **How It Works**

1. **Uptime Percentage**: Calculated as `(online APIs / total APIs) × 100`
2. **Compliance Percentage**: Uses the existing `overallScore` from the `computeMetrics` function, which combines HTTPS usage, response time performance, and availability scores
3. **Null Safety**: All metric values now have fallback values to prevent undefined display

The fix ensures that the dashboard always displays meaningful numeric values instead of "undefined%" text.
