export class BaseResponse {
    static success(data = null, message = "") {
        return {
            success: true,
            data,
            errors: [],
            message
        };
    }

    static error(errors = [], message = "", options={}) {
        return {
            success: false,
            data: null,
            errors,
            message,
            ...options
        };
    }
}