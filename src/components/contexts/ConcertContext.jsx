import { createContext, useContext, useState } from "react";


const ConcertContext = createContext();


export function ConcertProvider({ children }) {


    const [ConcertSelectionnee, setConcertSelectionnee] = useState(null);


    const selectConcert = (Concert) => {

        setConcertSelectionnee(Concert);

    };


    const clearConcert = () => {

        setConcertSelectionnee(null);

    };


    return (
        <ConcertContext.Provider
            value={{
                ConcertSelectionnee,
                selectConcert,
                clearConcert
            }}
        >
            {children}
        </ConcertContext.Provider>
    );

}


export function useConcert() {

    return useContext(ConcertContext);

}