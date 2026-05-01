import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseconfig";

const CUSTOMERS_COLLECTION = "Customers";
const MONTHLY_PASSES_COLLECTION = "MonthlyPasses";

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanAddress(address = {}) {
  return {
    streetAddress: cleanText(address.streetAddress),
    city: cleanText(address.city),
    state: cleanText(address.state),
    zipCode: cleanText(address.zipCode)
  };
}

function cleanVehicleInfo(vehicleInfo = {}) {
  return {
    year: cleanText(vehicleInfo.year),
    make: cleanText(vehicleInfo.make),
    model: cleanText(vehicleInfo.model),
    color: cleanText(vehicleInfo.color)
  };
}

function createGeneratedDocRef(collectionName) {
  return doc(collection(db, collectionName));
}

function cleanCustomerUpdates(updates = {}) {
  return {
    ...(updates.name !== undefined ? { name: cleanText(updates.name) } : {}),
    ...(updates.contactPerson !== undefined ? { contactPerson: cleanText(updates.contactPerson) } : {}),
    ...(updates.address !== undefined ? { address: cleanAddress(updates.address) } : {}),
    ...(updates.phone !== undefined ? { phone: cleanText(updates.phone) } : {}),
    ...(updates.email !== undefined ? { email: cleanText(updates.email) } : {})
  };
}

function cleanMonthlyPassUpdates(updates = {}) {
  return {
    ...(updates.customerId !== undefined ? { customerId: cleanText(updates.customerId) } : {}),
    ...(updates.planType !== undefined ? { planType: cleanText(updates.planType).toLowerCase() } : {}),
    ...(updates.planNumberId !== undefined ? { planNumberId: cleanText(updates.planNumberId) } : {}),
    ...(updates.vehicleInfo !== undefined ? { vehicleInfo: cleanVehicleInfo(updates.vehicleInfo) } : {}),
    ...(updates.notes !== undefined ? { notes: cleanText(updates.notes) } : {}),
    ...(updates.status !== undefined ? { status: cleanText(updates.status) } : {}),
    ...(updates.updateInfoFlag !== undefined ? { updateInfoFlag: Boolean(updates.updateInfoFlag) } : {})
  };
}

function buildCustomerRecord(customer = {}) {
  return {
    name: cleanText(customer.name),
    contactPerson: cleanText(customer.contactPerson),
    address: cleanAddress(customer.address),
    phone: cleanText(customer.phone),
    email: cleanText(customer.email),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
}

function buildMonthlyPassRecord(monthlyPass = {}) {
  return {
    customerId: cleanText(monthlyPass.customerId),
    planType: cleanText(monthlyPass.planType).toLowerCase(),
    planNumberId: cleanText(monthlyPass.planNumberId),
    vehicleInfo: cleanVehicleInfo(monthlyPass.vehicleInfo),
    notes: cleanText(monthlyPass.notes),
    status: 'needs credit card information',
    updateInfoFlag: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    closedAt: null
  };
}

async function createCustomer(customer = {}) {
  const customerRecord = buildCustomerRecord(customer);

  if (!customerRecord.name) {
    throw new Error('Customer name is required.');
  }

  const customerRef = createGeneratedDocRef(CUSTOMERS_COLLECTION);
  await setDoc(customerRef, customerRecord);

  return customerRef.id;
}

async function getCustomer(customerId) {
  try {
    const docRef = doc(db, CUSTOMERS_COLLECTION, customerId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data()
    };
  } catch (error) {
    console.error('Error reading customer:', error);
    throw error;
  }
}

async function getAllCustomers() {
  try {
    const querySnapshot = await getDocs(collection(db, CUSTOMERS_COLLECTION));
    const customers = [];

    querySnapshot.forEach((docSnap) => {
      customers.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    return customers;
  } catch (error) {
    console.error('Error reading customers:', error);
    throw error;
  }
}

async function updateCustomer(customerId, updates = {}) {
  try {
    const docRef = doc(db, CUSTOMERS_COLLECTION, customerId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error(`Customer with ID ${customerId} does not exist`);
    }

    const cleanUpdates = cleanCustomerUpdates(updates);

    if (Object.keys(cleanUpdates).length === 0) {
      return customerId;
    }

    await updateDoc(docRef, {
      ...cleanUpdates,
      updatedAt: serverTimestamp()
    });

    return customerId;
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
}

async function deleteCustomer(customerId) {
  try {
    const docRef = doc(db, CUSTOMERS_COLLECTION, customerId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error(`Customer with ID ${customerId} does not exist`);
    }

    await deleteDoc(docRef);
    return customerId;
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
}

async function createMonthlyPass(monthlyPass = {}) {
  const monthlyPassRecord = buildMonthlyPassRecord(monthlyPass);

  if (!monthlyPassRecord.customerId) {
    throw new Error('customerId is required.');
  }

  if (!monthlyPassRecord.planType) {
    throw new Error('planType is required.');
  }

  const monthlyPassRef = createGeneratedDocRef(MONTHLY_PASSES_COLLECTION);
  await setDoc(monthlyPassRef, monthlyPassRecord);

  return monthlyPassRef.id;
}

async function getMonthlyPass(passId) {
  try {
    const docRef = doc(db, MONTHLY_PASSES_COLLECTION, passId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data()
    };
  } catch (error) {
    console.error('Error reading monthly pass:', error);
    throw error;
  }
}

async function getAllMonthlyPasses() {
  try {
    const querySnapshot = await getDocs(collection(db, MONTHLY_PASSES_COLLECTION));
    const passes = [];

    querySnapshot.forEach((docSnap) => {
      passes.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    return passes;
  } catch (error) {
    console.error('Error reading monthly passes:', error);
    throw error;
  }
}

async function updateMonthlyPass(passId, updates = {}) {
  try {
    const docRef = doc(db, MONTHLY_PASSES_COLLECTION, passId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error(`Monthly pass with ID ${passId} does not exist`);
    }

    const cleanUpdates = cleanMonthlyPassUpdates(updates);

    if (Object.keys(cleanUpdates).length === 0) {
      return passId;
    }

    await updateDoc(docRef, {
      ...cleanUpdates,
      updatedAt: serverTimestamp()
    });

    return passId;
  } catch (error) {
    console.error('Error updating monthly pass:', error);
    throw error;
  }
}

async function deleteMonthlyPass(passId) {
  try {
    const docRef = doc(db, MONTHLY_PASSES_COLLECTION, passId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error(`Monthly pass with ID ${passId} does not exist`);
    }

    await deleteDoc(docRef);
    return passId;
  } catch (error) {
    console.error('Error deleting monthly pass:', error);
    throw error;
  }
}

async function createCustomerAndMonthlyPass({ customer = {}, monthlyPass = {} } = {}) {
  const customerId = await createCustomer(customer);
  const passId = await createMonthlyPass({
    ...monthlyPass,
    customerId
  });

  return {
    customerId,
    passId
  };
}

export {
  createCustomer,
  getCustomer,
  getAllCustomers,
  updateCustomer,
  deleteCustomer,
  createMonthlyPass,
  getMonthlyPass,
  getAllMonthlyPasses,
  updateMonthlyPass,
  deleteMonthlyPass,
  createCustomerAndMonthlyPass
};