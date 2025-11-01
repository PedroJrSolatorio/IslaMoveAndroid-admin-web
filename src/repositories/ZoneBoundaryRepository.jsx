import { db } from "../config/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

export class ZoneBoundaryRepository {
  constructor() {
    this.collectionRef = collection(db, "zone_boundaries");
  }

  async getAllZoneBoundaries() {
    const snapshot = await getDocs(this.collectionRef);
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((b) => b.isActive);
  }

  async addZoneBoundary(boundary) {
    const docRef = await addDoc(this.collectionRef, {
      ...boundary,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });
    return docRef.id;
  }

  async updateZoneBoundary(boundary) {
    await updateDoc(doc(this.collectionRef, boundary.id), {
      ...boundary,
      lastUpdated: Date.now(),
    });
  }

  async deleteZoneBoundary(id) {
    await deleteDoc(doc(this.collectionRef, id));
  }

  async boundaryNameExists(name, excludeId) {
    const q = query(
      this.collectionRef,
      where("name", "==", name),
      where("isActive", "==", true)
    );
    const snapshot = await getDocs(q);
    if (excludeId) {
      return snapshot.docs.some((doc) => doc.id !== excludeId);
    }
    return !snapshot.empty;
  }
}
