export default function TextRenderer({
    field,
    form,
    onChange
}) {

    return (
        <input
            value={form[field.field] || ""}
            onChange={(e) =>
                onChange(field.field, e.target.value)
            }
        />
    );
}