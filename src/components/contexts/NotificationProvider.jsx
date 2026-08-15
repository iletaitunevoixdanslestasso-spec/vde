import { useEffect, useState } from "react";
import NotificationService from "../../services/NotificationService";

export default function NotificationProvider({ children }) {

    const [notification, setNotification] = useState(null);

    useEffect(() => {

        const unsubscribe =
            NotificationService.subscribe(
                (newNotification) => {

                    setNotification(newNotification);

                    setTimeout(() => {
                        setNotification(current => {

                            if (
                                current?.id ===
                                newNotification.id
                            ) {
                                return null;
                            }

                            return current;
                        });
                    }, newNotification.duration);
                }
            );

        return unsubscribe;

    }, []);

    return (
        <>
            {children}

            {notification && (
                <div
                    style={{
                        position: "fixed",
                        top: "20px",
                        right: "20px",
                        zIndex: 9999,

                        minWidth: "280px",
                        maxWidth: "450px",

                        padding: "14px 18px",

                        borderRadius: "6px",

                        backgroundColor:
                            notification.type === "success"
                                ? "#d1fae5"
                                : notification.type === "error"
                                    ? "#fee2e2"
                                    : notification.type === "warning"
                                        ? "#fef3c7"
                                        : "#dbeafe",

                        color:
                            notification.type === "success"
                                ? "#065f46"
                                : notification.type === "error"
                                    ? "#991b1b"
                                    : notification.type === "warning"
                                        ? "#92400e"
                                        : "#1e40af",

                        border:
                            notification.type === "success"
                                ? "1px solid #6ee7b7"
                                : notification.type === "error"
                                    ? "1px solid #fca5a5"
                                    : notification.type === "warning"
                                        ? "1px solid #fcd34d"
                                        : "1px solid #93c5fd",

                        boxShadow:
                            "0 4px 12px rgba(0,0,0,0.15)"
                    }}
                >
                    {notification.message}
                </div>
            )}
        </>
    );
}