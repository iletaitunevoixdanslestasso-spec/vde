export default function NumberRenderer({
    field,
    form,
    onChange
}) {

    return (
        <div>

            <input
                type="number"
                value={form[field.field] || ""}
                onChange={(e) =>
                    onChange(field.field, e.target.value)
                }
            />
        </div>
    );
}