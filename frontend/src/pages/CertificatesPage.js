import { useState, useEffect } from 'react';
import axios from 'axios';
import { Sidebar } from '@/components/Sidebar';
import { Award } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const CertificatesPage = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/certificates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCertificates(response.data);
    } catch (error) {
      console.error('Certificates fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-950"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#FAFAFA]" data-testid="certificates-page">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-zinc-950 mb-8">
            Mis Certificados
          </h1>

          {certificates.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-lg p-12 text-center">
              <Award className="h-12 w-12 text-zinc-400 mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-xl font-heading font-semibold text-zinc-950 mb-2">
                No tienes certificados aún
              </h3>
              <p className="text-zinc-600">
                Completa tus primeros cursos para obtener certificados
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map((cert) => (
                <div
                  key={cert.certificate_id}
                  className="bg-white border border-zinc-200 rounded-lg p-8 hover:-translate-y-1 hover:shadow-md hover:border-zinc-300 transition-all duration-200"
                  data-testid={`certificate-card-${cert.certificate_id}`}
                >
                  <Award className="h-12 w-12 text-emerald-500 mb-4" strokeWidth={1.5} />
                  <h3 className="text-xl font-heading font-semibold text-zinc-950 mb-2">
                    {cert.course_title}
                  </h3>
                  <p className="text-sm text-zinc-600 mb-1">Por {cert.instructor_name}</p>
                  <p className="text-sm text-zinc-600 mb-4">
                    Completado por {user?.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Emitido: {new Date(cert.issued_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};