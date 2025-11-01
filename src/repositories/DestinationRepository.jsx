import { db } from "../config/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
} from "firebase/firestore";

export class DestinationRepository {
  constructor() {
    this.collectionRef = collection(db, "destinations");
  }

  async getAllDestinations() {
    const snapshot = await getDocs(this.collectionRef);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async addDestination(destination) {
    const docRef = await addDoc(this.collectionRef, {
      ...destination,
      createdAt: Date.now(),
    });
    return docRef.id;
  }

  async updateDestination(destination) {
    await updateDoc(doc(this.collectionRef, destination.id), destination);
  }

  async deleteDestination(id) {
    await deleteDoc(doc(this.collectionRef, id));
  }
}
