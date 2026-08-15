class NotificationService {

    constructor() {
        this.listeners = new Set();
    }

    subscribe(listener) {
        this.listeners.add(listener);

        return () => {
            this.listeners.delete(listener);
        };
    }

    notify(type, message, duration = 5000) {

        const notification = {
            id: Date.now(),
            type,
            message,
            duration
        };

        this.listeners.forEach(listener => {
            listener(notification);
        });
    }

    success(message, duration = 2000) {
        this.notify("success", message, duration);
    }

    error(message, duration = 5000) {
        this.notify("error", message, duration);
    }

    warning(message, duration = 3000) {
        this.notify("warning", message, duration);
    }

    info(message, duration = 5000) {
        this.notify("info", message, duration);
    }
}

export default new NotificationService();