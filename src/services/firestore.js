import {
    collection,
    getDocs,
    doc,
    setDoc,
    deleteDoc,
    query,
    where
} from "firebase/firestore";
import { db } from "../firebaseConfig";

export const FirestoreService = {
    // Fetch all documents from a collection and preserve their Firestore IDs
    async getAll(collectionName) {
        try {
            const snap = await getDocs(collection(db, collectionName));
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (error) {
            console.error(`Error fetching ${collectionName}:`, error);
            return [];
        }
    },

    // Direct case-insensitive email lookup for lightning-fast logins
    async findMemberByEmail(email) {
        try {
            const cleanEmail = email.trim().toLowerCase();
            // First try checking against an email_lower indexed field
            let q = query(collection(db, "members"), where("email_lower", "==", cleanEmail));
            let snap = await getDocs(q);

            // Fallback: Check standard email field if email_lower wasn't set in your CSV import
            if (snap.empty) {
                q = query(collection(db, "members"), where("email", "==", cleanEmail));
                snap = await getDocs(q);
            }

            if (!snap.empty) {
                const d = snap.docs[0];
                return { id: d.id, ...d.data() };
            }
            return null;
        } catch (error) {
            console.error("Error finding member by email:", error);
            return null;
        }
    },

    // Save or overwrite a document using an explicit ID
    async saveDocument(collectionName, docId, data) {
        try {
            await setDoc(doc(db, collectionName, String(docId)), data, { merge: true });
            return true;
        } catch (error) {
            console.error(`Error saving to ${collectionName}:`, error);
            return false;
        }
    },

    // Delete a document by ID
    async deleteDocument(collectionName, docId) {
        try {
            await deleteDoc(doc(db, collectionName, String(docId)));
            return true;
        } catch (error) {
            console.error(`Error deleting from ${collectionName}:`, error);
            return false;
        }
    }
};