import { createContext, useContext, useState } from "react";


const ChansonContext = createContext();


export function ChansonProvider({ children }) {


    const [chansonSelectionnee, setChansonSelectionnee] = useState(null);


    const selectChanson = (chanson) => {

        setChansonSelectionnee(chanson);

    };


    const clearChanson = () => {

        setChansonSelectionnee(null);

    };


    return (
        <ChansonContext.Provider
            value={{
                chansonSelectionnee,
                selectChanson,
                clearChanson
            }}
        >
            {children}
        </ChansonContext.Provider>
    );

}


export function useChanson() {

    return useContext(ChansonContext);

}