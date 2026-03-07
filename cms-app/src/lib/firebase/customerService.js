import { db } from './config'; // Import your Firebase config
import { 
  collection, 
  getDocs, 
  query, 
  orderBy,
  Timestamp,
  writeBatch,
  doc 
} from 'firebase/firestore';

export const fetchAllCustomers = async () => {
  try {
    const customersRef = collection(db, 'customers'); // Adjust collection name as needed
    const q = query(customersRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const customers = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      customers.push({
        id: doc.id,
        ...data
      });
    });
    
    return customers;
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
};

export const formatCustomerForExport = (customer) => {
  // Handle Firestore Timestamps
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleDateString();
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString();
    }
    if (typeof timestamp === 'string') {
      return new Date(timestamp).toLocaleDateString();
    }
    return '';
  };

  return {
    'Customer ID': customer.id || '',
    'First Name': customer.firstName || customer.first_name || '',
    'Last Name': customer.lastName || customer.last_name || '',
    'Email': customer.email || '',
    'Phone': customer.phone || customer.phoneNumber || '',
    'Address': customer.address || '',
    'Address Line 2': customer.addressLine2 || '',
    'City': customer.city || '',
    'State': customer.state || customer.province || '',
    'Zip Code': customer.zipCode || customer.postalCode || '',
    'Country': customer.country || '',
    'Company': customer.company || customer.companyName || '',
    'Status': customer.status || 'Active',
    'Total Purchases': customer.totalPurchases || customer.purchases || 0,
    'Last Purchase Date': formatDate(customer.lastPurchaseDate),
    'Notes': customer.notes || '',
    'Tags': Array.isArray(customer.tags) ? customer.tags.join(', ') : customer.tags || '',
    'Created At': formatDate(customer.createdAt),
    'Updated At': formatDate(customer.updatedAt),
  };
};

export const uploadCustomersToFirebase = async (customers) => {
  try {
    const batch = writeBatch(db);
    const customersRef = collection(db, 'customers');

    customers.forEach((customer) => {
      const newDocRef = doc(customersRef);
      batch.set(newDocRef, customer);
    });

    await batch.commit();
    return { success: true, count: customers.length };
  } catch (error) {
    console.error('Error uploading customers:', error);
    throw error;
  }
};