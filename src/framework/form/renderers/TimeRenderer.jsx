export default function TimeRenderer({
    field,
    form,
    onChange
}) {

    return (
        <input
            type={`time`}
            value={form[field.field] || ""}
            onChange={(e) =>
                onChange(field.field, e.target.value)
            }
        />
    );
}