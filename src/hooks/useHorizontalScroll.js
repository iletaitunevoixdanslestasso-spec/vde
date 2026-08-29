import {
    useCallback,
    useEffect,
    useRef,
    useState
} from "react";


export function useHorizontalScroll() {

    const scrollRef = useRef(null);
    const [hasHorizontalScroll, setHasHorizontalScroll] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);


    /* =====================================================
       CALCUL DE L'ETAT DU SCROLL
       ===================================================== */

    const updateScrollState = useCallback(() => {

        const el = scrollRef.current;

        if (!el) {

            setCanScrollLeft(false);
            setCanScrollRight(false);

            return;
        }

        const maxScrollLeft =
            Math.max(0, el.scrollWidth - el.clientWidth);

        // setHasHorizontalScroll(maxScrollLeft > 5);

        setCanScrollLeft(
            el.scrollLeft > 5
        );

        setCanScrollRight(
            maxScrollLeft > 5 &&
            el.scrollLeft < maxScrollLeft - 5
        );

    }, []);


    /* =====================================================
       SCROLL GAUCHE
       ===================================================== */

    const scrollLeft = useCallback(() => {

        const el = scrollRef.current;

        if (!el) return;

        el.scrollBy({
            left: -180,
            behavior: "smooth"
        });

    }, []);


    /* =====================================================
       SCROLL DROITE
       ===================================================== */

    const scrollRight = useCallback(() => {

        const el = scrollRef.current;

        if (!el) return;

        el.scrollBy({
            left: 180,
            behavior: "smooth"
        });

    }, []);


    /* =====================================================
       ALLER SUR UN ELEMENT
       ===================================================== */

    const scrollToElement = useCallback((element) => {

        const container = scrollRef.current;

        if (!container || !element) return;

        const containerRect =
            container.getBoundingClientRect();

        const elementRect =
            element.getBoundingClientRect();

        const offset =
            elementRect.left -
            containerRect.left +
            container.scrollLeft;


        container.scrollTo({
            left: Math.max(0, offset),
            behavior: "smooth"
        });

    }, []);


    /* =====================================================
       SURVEILLANCE
       ===================================================== */

    useEffect(() => {

        const el = scrollRef.current;

        if (!el) return;


        /* Calcul initial */

        updateScrollState();


        /* Scroll */

        el.addEventListener(
            "scroll",
            updateScrollState,
            { passive: true }
        );


        /* Resize fenêtre */

        window.addEventListener(
            "resize",
            updateScrollState
        );


        /* ResizeObserver */

        const resizeObserver =
            new ResizeObserver(() => {

                updateScrollState();

            });


        resizeObserver.observe(el);


        Array.from(el.children).forEach(child => {

            resizeObserver.observe(child);

        });


        /* =================================================
           MutationObserver
           Important lorsque le dropdown apparaît
           ou que son contenu change
           ================================================= */

        const mutationObserver =
            new MutationObserver(() => {

                requestAnimationFrame(() => {

                    updateScrollState();

                });

            });


        mutationObserver.observe(el, {

            childList: true,
            subtree: true,
            attributes: true

        });


        /* =================================================
           NETTOYAGE
           ================================================= */

        return () => {

            el.removeEventListener(
                "scroll",
                updateScrollState
            );

            window.removeEventListener(
                "resize",
                updateScrollState
            );

            resizeObserver.disconnect();

            mutationObserver.disconnect();

        };

    }, [updateScrollState]);


    /* =====================================================
       RETOUR
       ================================================= */

    return {

        scrollRef,

        hasHorizontalScroll,

        canScrollLeft,
        canScrollRight,

        scrollLeft,
        scrollRight,

        scrollToElement,

        updateScrollState

    };

}