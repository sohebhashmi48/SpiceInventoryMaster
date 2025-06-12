// Debug script to check distribution items
// Run this in your browser console on the distribution page

async function debugDistribution() {
  // Get the distribution ID from the URL
  const url = window.location.pathname;
  const distributionId = url.split('/').pop();
  
  console.log('🔍 Debugging Distribution ID:', distributionId);
  
  try {
    // 1. Check the main distribution endpoint
    console.log('\n📡 Fetching distribution data...');
    const distributionResponse = await fetch(`/api/distributions/${distributionId}`, {
      credentials: 'include'
    });
    
    if (!distributionResponse.ok) {
      console.error('❌ Distribution API failed:', distributionResponse.status, distributionResponse.statusText);
      return;
    }
    
    const distributionData = await distributionResponse.json();
    console.log('✅ Distribution data:', distributionData);
    
    // 2. Check if items are included in the main response
    if (distributionData.items) {
      console.log('📦 Items in main response:', distributionData.items.length, distributionData.items);
    } else {
      console.log('⚠️ No items in main response');
    }
    
    // 3. Check the dedicated items endpoint
    console.log('\n📡 Fetching items separately...');
    const itemsResponse = await fetch(`/api/distributions/${distributionId}/items`, {
      credentials: 'include'
    });
    
    if (!itemsResponse.ok) {
      console.error('❌ Items API failed:', itemsResponse.status, itemsResponse.statusText);
      return;
    }
    
    const itemsData = await itemsResponse.json();
    console.log('✅ Items data:', itemsData.length, itemsData);
    
    // 4. Check what the React component is receiving
    console.log('\n🔍 Checking React component state...');
    
    // Try to find the React component instance
    const reactRoot = document.querySelector('#root');
    if (reactRoot && reactRoot._reactInternalInstance) {
      console.log('Found React component');
    }
    
    // 5. Summary
    console.log('\n📋 SUMMARY:');
    console.log('Distribution ID:', distributionId);
    console.log('Distribution exists:', !!distributionData);
    console.log('Items in main response:', distributionData.items?.length || 0);
    console.log('Items in separate endpoint:', itemsData?.length || 0);
    
    if (itemsData?.length === 0) {
      console.log('\n🚨 ISSUE: No items found in database');
      console.log('This means either:');
      console.log('1. The items were not saved when the bill was created');
      console.log('2. The database query is not finding the items');
      console.log('3. There is a table structure issue');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug function
debugDistribution();
