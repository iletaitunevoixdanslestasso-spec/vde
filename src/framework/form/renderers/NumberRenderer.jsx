export default function NumberRenderer({
    field,
    form,
    onChange
}) {

    return (
        <div>

            <input
                type="number"
                value={form[field.field] ?? ""}
                min={field.min}
                max={field.max}
                step={field.step}
                placeholder={field.placeholder}
                onChange={(e) =>
                    onChange(field.field, e.target.value)
                }
            />
        </div>
    );
}
