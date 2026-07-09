import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "@/App.css";
import TopNav from "@/components/TopNav";
import Landing from "@/pages/Landing";
import FanApp from "@/pages/FanApp";
import OpsCommand from "@/pages/OpsCommand";
import { getVenues, getMatches, listIncidents } from "@/lib/api";

function Shell() {
    const [role, setRole] = useState(() => window.localStorage.getItem("pitchops-role") || "fan");
    const [venues, setVenues] = useState([]);
    const [venueId, setVenueId] = useState(() => window.localStorage.getItem("pitchops-venue") || "metlife");
    const [matches, setMatches] = useState([]);
    const [incidents, setIncidents] = useState([]);

    useEffect(() => {
        window.localStorage.setItem("pitchops-role", role);
    }, [role]);
    useEffect(() => {
        window.localStorage.setItem("pitchops-venue", venueId);
    }, [venueId]);

    // Load static reference data once
    useEffect(() => {
        let alive = true;
        Promise.all([getVenues(), getMatches()])
            .then(([vs, ms]) => {
                if (!alive) return;
                setVenues(vs);
                setMatches(ms);
            })
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, []);

    const refreshIncidents = useCallback(() => {
        listIncidents(venueId).then(setIncidents).catch(() => {});
    }, [venueId]);

    useEffect(() => {
        refreshIncidents();
        const t = setInterval(refreshIncidents, 20000);
        return () => clearInterval(t);
    }, [refreshIncidents]);

    const venue = useMemo(() => venues.find((v) => v.id === venueId) || null, [venues, venueId]);

    return (
        <>
            <TopNav
                role={role}
                setRole={setRole}
                venue={venue}
                venues={venues}
                setVenueId={setVenueId}
            />
            <Routes>
                <Route path="/" element={<Landing setRole={setRole} />} />
                <Route
                    path="/fan"
                    element={
                        <FanApp
                            role={role}
                            venue={venue}
                            matches={matches}
                            incidents={incidents}
                            refreshIncidents={refreshIncidents}
                        />
                    }
                />
                <Route
                    path="/ops"
                    element={
                        <OpsCommand
                            role={role}
                            venue={venue}
                            matches={matches}
                            incidents={incidents}
                            refreshIncidents={refreshIncidents}
                        />
                    }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    );
}

export default function App() {
    return (
        <div className="App">
            <BrowserRouter>
                <Shell />
            </BrowserRouter>
        </div>
    );
}
