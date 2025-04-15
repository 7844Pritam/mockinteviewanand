// hooks/useNotifications.js
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const auth = getAuth();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("receiverUid", "==", user.uid),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setNotifications(data);
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  return notifications;
};
