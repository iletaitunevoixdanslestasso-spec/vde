import "./EspaceChanteurPageHeader.css";

export default function EspaceChanteurPageHeader({
    title,
    subtitle,
    count = null,
    singular,
    plural,
    iconClass = "",
    iconContent = null
}) {

    const hasCount =
        count !== null &&
        count !== undefined;

    return (
        <header className="chansons-page-header">

            <div
                className={[
                    "chansons-page-header-icon",
                    iconClass,
                    "active"
                ]
                    .filter(Boolean)
                    .join(" ")}
            >
                {iconContent}
            </div>

            <div className="chansons-page-header-content">

                <h1 className="chansons-page-title">
                    {title}
                </h1>

                {subtitle && (
                    <p className="chansons-page-subtitle">
                        {subtitle}
                    </p>
                )}

            </div>

            {hasCount && (
                <div className="chansons-page-count">

                    <strong>
                        {count}
                    </strong>

                    <span>
                        {count > 1
                            ? plural
                            : singular}
                    </span>

                </div>
            )}

        </header>
    );
}
