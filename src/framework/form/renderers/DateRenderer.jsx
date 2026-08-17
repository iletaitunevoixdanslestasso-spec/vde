export default function DateRenderer({
    field,
    form,
    onChange
}) {
    console.log(form)
    console.log(field)
    console.log(field.field)
    console.log(form[field.field])
    const value = form[field.field]
        ? form[field.field].substring(0, 10)
        : "";

    return (
            <input
                type="date"
                value={value || ""}
                onChange={(e) =>
                    onChange(field.field, e.target.value)
                }
            />
    );
}