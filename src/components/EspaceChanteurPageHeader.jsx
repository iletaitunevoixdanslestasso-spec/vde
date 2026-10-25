import "./EspaceChanteurPageHeader.css";
import CountBadge from "/src/components/common/CountBadge.jsx";

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
                <CountBadge
                    count={count}
                    singular={singular}
                    plural={plural}
                />
            )}

        </header>
    );
}
