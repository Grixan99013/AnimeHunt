// src/pages/AdminPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AnimeForm from "../components/AnimeForm";
import { fetchGenres, fetchStudios } from "../api/api";

export default function AdminPage() {
  const navigate = useNavigate();
  const [genres, setGenres] = useState([]);
  const [studios, setStudios] = useState([]);
  const [loadErr, setLoadErr] = useState("");

  useEffect(() => {
    Promise.all([fetchGenres(), fetchStudios()])
      .then(([g, s]) => {
        setGenres(g);
        setStudios(s);
      })
      .catch(e => setLoadErr(e.message));
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Комната администратора</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
          Добавление нового тайтла в каталог
        </p>
      </div>

      {loadErr ? (
        <p className="text-sm" style={{ color: "#f87171" }}>{loadErr}</p>
      ) : (
        <div className="rounded-2xl p-6 md:p-8"
          style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)" }}>
          <AnimeForm
            genreList={genres}
            studioList={studios}
            onAfterSave={() => fetchStudios().then(setStudios)}
            onSaved={({ id }) => navigate(`/anime/${id}`)}
          />
        </div>
      )}
    </div>
  );
}
