export default function TextareaRenderer({
    field,
    form,
    onChange
}) {
    return (
        <textarea
            value={form[field.field] || ""}
            onChange={(e) =>
                onChange(field.field, e.target.value)
            }
        />
    );
}