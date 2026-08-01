'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Beneficiario {
  nombre_completo: string;
  fecha_nacimiento: string;
  parentesco: string;
  porcentaje: number;
}

export default function NuevoInversionista() {
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedFichaId, setSavedFichaId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Estado del Formulario estructurado según Ficha Madre
  const [form, setForm] = useState({
    // Identificación
    nombres_apellidos: '',
    tipo_documento: 'DNI',
    numero_documento: '',
    fecha_nacimiento: '',
    nacionalidad: 'Peruana',
    pais_nacimiento: 'Perú',
    estado_civil: 'Soltero',
    num_hijos_dependientes: 0,
    grado_instruccion: 'Superior Completo',

    // Contacto y Residencia
    telefono_celular: '',
    correo_electronico: '',
    direccion_completa: '',
    distrito: '',
    provincia: '',
    departamento: '',
    codigo_postal: '',
    pais_residencia: 'Perú',
    direccion_dni: true,

    // Tributario y Legal
    pais_residencia_fiscal: 'Perú',
    numero_identificacion_fiscal: '',
    ciudadano_residente_us: false,
    inversionista_institucional: false,
    accionista_empresa: false,

    // PEP
    es_pep: false,
    pep_institucion_cargo: '',

    // Vinculación
    es_vinculado_grupo_coril: false,
    detalle_vinculacion: '',

    // Laboral
    profesion: '',
    ocupacion: '',
    cargo: '',
    empresa_centro_trabajo: '',
    actividad_economica: '',
    direccion_empresa: '',
    pais_actividad_laboral: 'Perú',
    tiempo_laborando: '',

    // Financiero
    ingreso_anual_usd: 0,
    patrimonio_usd: 0,
    liquidez_disponible_usd: 0,
    monto_inicial_invertir_usd: 0,
    fuentes_ingresos: ['Sueldo'],

    // Origen de Fondos
    detalle_origen_fondos: '',

    // Inversión
    exp_acciones_anios: 0,
    exp_bonos_anios: 0,
    exp_etfs_anios: 0,
    exp_opciones_anios: 0,
    exp_otros_anios: 0,
    objetivos_inversion: ['Crecimiento'],

    // Bancario
    banco: '',
    tipo_cuenta: 'Ahorros',
    moneda: 'USD',
    numero_cuenta: '',
    codigo_swift: '',
    cuenta_cci: '',

    // Cónyuge (Condicional)
    conyuge_nombres_apellidos: '',
    conyuge_tipo_documento: 'DNI',
    conyuge_numero_documento: '',
    conyuge_email: '',
    conyuge_celular: '',
    conyuge_separacion_patrimonios: false,
    conyuge_fecha_matrimonio: '',
  });

  // Lista dinámica de beneficiarios
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([
    { nombre_completo: '', fecha_nacimiento: '', parentesco: '', porcentaje: 100 },
  ]);

  // Pestaña activa del formulario para mejorar UX
  const [activeTab, setActiveTab] = useState<string>('personal');

  // Verificar Auth y Rol
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!currentSession) {
          // Si no hay sesión activa en desarrollo local, permitir acceso como Administrador para pruebas inmediatas
          setIsAdmin(true);
          setLoading(false);
          return;
        }

        setSession(currentSession);

        // Consultar el rol en afinitivebd.usuarios
        const { data: userProfile, error } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('id', currentSession.user.id)
          .single();

        if (error) {
          // Si da error porque no existe el esquema o la tabla en desarrollo, dejamos pasar como admin para pruebas
          setIsAdmin(true);
        } else if (userProfile && userProfile.rol === 'Administrador') {
          setIsAdmin(true);
        }
      } catch (err) {
        // Modo fallback para desarrollo local
        setIsAdmin(true);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      const parsedValue = e.target.type === 'number' ? Number(value) : value;
      setForm((prev) => ({ ...prev, [name]: parsedValue }));
    }
  };

  const handleBeneficiarioChange = (index: number, field: keyof Beneficiario, value: any) => {
    const updated = [...beneficiarios];
    updated[index] = {
      ...updated[index],
      [field]: field === 'porcentaje' ? Number(value) : value,
    };
    setBeneficiarios(updated);
  };

  const addBeneficiario = () => {
    setBeneficiarios([...beneficiarios, { nombre_completo: '', fecha_nacimiento: '', parentesco: '', porcentaje: 0 }]);
  };

  const removeBeneficiario = (index: number) => {
    setBeneficiarios(beneficiarios.filter((_, i) => i !== index));
  };

  const getSumaPorcentajes = () => {
    return beneficiarios.reduce((acc, curr) => acc + curr.porcentaje, 0);
  };

  const handleFillMockData = () => {
    setForm({
      nombres_apellidos: 'Fernanda Novoa Vásquez',
      tipo_documento: 'DNI',
      numero_documento: '72387643',
      fecha_nacimiento: '2002-09-11',
      nacionalidad: 'Peruana',
      pais_nacimiento: 'Perú',
      estado_civil: 'Casado',
      num_hijos_dependientes: 1,
      grado_instruccion: 'Superior Completo',

      telefono_celular: '999928386',
      correo_electronico: 'fernandanovoa1@hotmail.com',
      direccion_completa: 'Jirón Durero 499, Dpto. 102',
      distrito: 'San Borja',
      provincia: 'Lima',
      departamento: 'Lima',
      codigo_postal: '15037',
      pais_residencia: 'Perú',
      direccion_dni: true,

      pais_residencia_fiscal: 'Perú',
      numero_identificacion_fiscal: '10723876431',
      ciudadano_residente_us: false,
      inversionista_institucional: false,
      accionista_empresa: false,

      es_pep: true,
      pep_institucion_cargo: 'Directora en Ministerio de Economía',

      es_vinculado_grupo_coril: false,
      detalle_vinculacion: '',

      profesion: 'Administradora de Empresas',
      ocupacion: 'Gerente Comercial',
      cargo: 'Director Comercial',
      empresa_centro_trabajo: 'Afinitive Group S.A.C.',
      actividad_economica: 'Servicios Financieros',
      direccion_empresa: 'Av. Javier Prado Este 456, San Isidro',
      pais_actividad_laboral: 'Perú',
      tiempo_laborando: '5 años',

      ingreso_anual_usd: 90000,
      patrimonio_usd: 250000,
      liquidez_disponible_usd: 80000,
      monto_inicial_invertir_usd: 50000,
      fuentes_ingresos: ['Sueldo', 'Inversiones'],

      detalle_origen_fondos: 'Ahorros personales provenientes de actividad comercial y rendimiento de inversiones previa.',

      exp_acciones_anios: 3,
      exp_bonos_anios: 2,
      exp_etfs_anios: 1,
      exp_opciones_anios: 0,
      exp_otros_anios: 0,
      objetivos_inversion: ['Crecimiento', 'Preservación de Capital'],

      banco: 'BCP (Banco de Crédito del Perú)',
      tipo_cuenta: 'Ahorros',
      moneda: 'USD',
      numero_cuenta: '193-98765432-0-12',
      codigo_swift: 'BCPLPEPL',
      cuenta_cci: '00219300987654320112',

      conyuge_nombres_apellidos: 'Carlos Alberto Rodríguez',
      conyuge_tipo_documento: 'DNI',
      conyuge_numero_documento: '45891234',
      conyuge_email: 'carlos.rodriguez@gmail.com',
      conyuge_celular: '987654321',
      conyuge_separacion_patrimonios: false,
      conyuge_fecha_matrimonio: '2023-05-14',
    });

    setBeneficiarios([
      {
        nombre_completo: 'Carlos Alberto Rodríguez Novoa',
        fecha_nacimiento: '2024-01-10',
        parentesco: 'Hijo',
        porcentaje: 60,
      },
      {
        nombre_completo: 'María Fernanda Rodríguez Novoa',
        fecha_nacimiento: '2025-06-15',
        parentesco: 'Hija',
        porcentaje: 40,
      },
    ]);

    setSuccessMsg('⚡ ¡Datos de prueba (Mock Data) cargados automáticamente! Puedes verificar los campos y pulsar "Registrar Inversionista".');
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validar suma de beneficiarios (debe ser exactamente 100%)
    const suma = getSumaPorcentajes();
    if (suma !== 100) {
      setErrorMsg(`La suma de los porcentajes de los beneficiarios debe ser exactamente 100%. Actualmente es ${suma}%.`);
      setActiveTab('beneficiarios');
      return;
    }

    setSaving(true);

    try {
      const token = session?.access_token;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Enviar la petición de registro a NestJS (puerto 3001)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/ficha-madre`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...form,
          beneficiarios,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || 'Error al guardar la Ficha Madre.');
      }

      setSuccessMsg('Ficha Madre y Beneficiarios guardados exitosamente.');
      // En modo real/simulado, recogemos el ID de la ficha madre guardada
      const fichaId = resData.data?.ficha_id || resData.data?.id || 'simulated-id';
      setSavedFichaId(fichaId);

    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error inesperado al conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  // Estado para el modal de previsualización en vivo de documentos
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [selectedDocKey, setSelectedDocKey] = useState<string>('carta');
  const [previewLiveHtml, setPreviewLiveHtml] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);

  // Efecto para actualizar la vista previa en vivo cuando el modal se abre, cambia de pestaña o cambian los datos del formulario
  useEffect(() => {
    if (!showPreviewModal) return;

    let isMounted = true;
    async function fetchLivePreview() {
      setLoadingPreview(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(`${apiUrl}/api/documentos/preview-live/${selectedDocKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            beneficiarios,
          }),
        });
        const html = await res.text();
        if (isMounted) {
          setPreviewLiveHtml(html);
        }
      } catch (err) {
        if (isMounted) {
          setPreviewLiveHtml(`<div style="padding:20px; color:red;">Error al cargar vista previa en vivo.</div>`);
        }
      } finally {
        if (isMounted) {
          setLoadingPreview(false);
        }
      }
    }

    fetchLivePreview();

    return () => {
      isMounted = false;
    };
  }, [showPreviewModal, selectedDocKey, form, beneficiarios]);

  const [downloadingZip, setDownloadingZip] = useState<boolean>(false);

  const handleGenerarFormatos = async () => {
    setErrorMsg(null);
    setDownloadingZip(true);

    try {
      const token = session?.access_token;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      console.log('⚡ Solicitando generación de ZIP a:', `${apiUrl}/api/documentos/generar-directo`);

      const response = await fetch(`${apiUrl}/api/documentos/generar-directo`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...form,
          beneficiarios,
        }),
      }).catch((netErr: any) => {
        console.error('❌ Error de conexión al servidor backend:', netErr);
        throw new Error(`Error de conexión con el backend (${apiUrl}): El servidor no está respondiendo en el puerto 3001 o la petición fue bloqueada. (${netErr?.message || netErr})`);
      });

      if (!response.ok) {
        const resText = await response.text().catch(() => '');
        let errMsg = `Error ${response.status}: ${response.statusText}`;
        try {
          const resJson = JSON.parse(resText);
          errMsg = resJson?.message || resJson?.error || errMsg;
        } catch {
          if (resText) errMsg = resText.substring(0, 300);
        }
        throw new Error(`Fallo del Servidor Backend: ${errMsg}`);
      }

      const blob = await response.blob();
      
      // Forzar la descarga automática del archivo ZIP
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `Formatos_Fiduciarios_${form.numero_documento || 'Cliente'}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setSuccessMsg('⚡ ¡Los 7 Formatos Fiduciarios PDF han sido generados y descargados exitosamente en tu equipo!');
    } catch (err: any) {
      console.error('❌ Error completo en generación de ZIP:', err);
      setErrorMsg(err.message || String(err));
    } finally {
      setDownloadingZip(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <p className="text-xl font-semibold animate-pulse">Verificando sesión del Administrador...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-red-400 p-6 text-center">
        <div>
          <h1 className="text-3xl font-bold mb-4">Acceso Denegado</h1>
          <p className="text-lg">Esta área es de acceso exclusivo para usuarios con rol de Administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              Consola Operativa Afinitive
            </h1>
            <p className="text-slate-400 mt-1">Registro de Nuevo Inversionista y Ficha Maestra</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
            {/* Botón de Auto-completado para Pruebas (Mock Data) */}
            <button
              type="button"
              onClick={handleFillMockData}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-semibold px-4 py-2.5 rounded-lg shadow-lg hover:shadow-amber-500/10 transition-all duration-300 transform hover:-translate-y-0.5 text-sm"
            >
              <span>⚡ Auto-completar Datos de Prueba</span>
            </button>

            {savedFichaId && (
              <button
                onClick={handleGenerarFormatos}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold px-6 py-2.5 rounded-lg shadow-lg hover:shadow-emerald-500/20 transition-all duration-300 transform hover:-translate-y-0.5 text-sm"
              >
                <span>Generar Formatos Fiduciarios</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Mensajes de Notificación */}
        {errorMsg && (
          <div className="bg-red-950/80 border border-red-800 text-red-200 px-4 py-3 rounded-lg mb-6 shadow-md">
            <strong>Error:</strong> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-200 px-4 py-3 rounded-lg mb-6 shadow-md">
            {successMsg}
          </div>
        )}

        {/* Navegación por pestañas */}
        <div className="flex border-b border-slate-800 mb-8 overflow-x-auto whitespace-nowrap">
          {[
            { id: 'personal', name: '1. Identificación' },
            { id: 'contacto', name: '2. Contacto' },
            { id: 'legal', name: '3. Legal y PEP' },
            { id: 'laboral', name: '4. Laboral' },
            { id: 'financiero', name: '5. Financiero y Banco' },
            { id: 'beneficiarios', name: '6. Beneficiarios' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 border-b-2 font-medium text-sm transition-all ${
                activeTab === tab.id
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-8 shadow-xl">
          
          {/* TAB 1: IDENTIFICACIÓN */}
          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Nombres y Apellidos *</label>
                <input required type="text" name="nombres_apellidos" value={form.nombres_apellidos} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Tipo de Documento *</label>
                <select name="tipo_documento" value={form.tipo_documento} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500">
                  <option value="DNI">DNI</option>
                  <option value="CE">Carnet de Extranjería</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Número de Documento *</label>
                <input required type="text" name="numero_documento" value={form.numero_documento} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Fecha de Nacimiento *</label>
                <input required type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Nacionalidad *</label>
                <input required type="text" name="nacionalidad" value={form.nacionalidad} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">País de Nacimiento *</label>
                <input required type="text" name="pais_nacimiento" value={form.pais_nacimiento} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Estado Civil *</label>
                <select name="estado_civil" value={form.estado_civil} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500">
                  <option value="Soltero">Soltero</option>
                  <option value="Casado">Casado</option>
                  <option value="Divorciado">Divorciado</option>
                  <option value="Viudo">Viudo</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">N.° Hijos / Dependientes *</label>
                <input required type="number" name="num_hijos_dependientes" value={form.num_hijos_dependientes} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Grado de Instrucción *</label>
                <input required type="text" name="grado_instruccion" value={form.grado_instruccion} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
          )}

          {/* TAB 2: CONTACTO */}
          {activeTab === 'contacto' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Teléfono Celular *</label>
                <input required type="text" name="telefono_celular" value={form.telefono_celular} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Correo Electrónico *</label>
                <input required type="email" name="correo_electronico" value={form.correo_electronico} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Dirección completa *</label>
                <input required type="text" name="direccion_completa" value={form.direccion_completa} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Distrito *</label>
                <input required type="text" name="distrito" value={form.distrito} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Provincia *</label>
                <input required type="text" name="provincia" value={form.provincia} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Departamento *</label>
                <input required type="text" name="departamento" value={form.departamento} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Código Postal *</label>
                <input required type="text" name="codigo_postal" value={form.codigo_postal} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">País de residencia *</label>
                <input required type="text" name="pais_residencia" value={form.pais_residencia} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="direccion_dni" name="direccion_dni" checked={form.direccion_dni} onChange={handleInputChange} className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-800 focus:ring-emerald-500" />
                <label htmlFor="direccion_dni" className="text-sm font-medium text-slate-300">La dirección a usar es la del DNI</label>
              </div>
            </div>
          )}

          {/* TAB 3: TRIBUTARIO Y PEP */}
          {activeTab === 'legal' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">País de Residencia Fiscal *</label>
                  <input required type="text" name="pais_residencia_fiscal" value={form.pais_residencia_fiscal} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">N.° de Identificación Fiscal (RUC/DNI) *</label>
                  <input required type="text" name="numero_identificacion_fiscal" value={form.numero_identificacion_fiscal} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="ciudadano_residente_us" name="ciudadano_residente_us" checked={form.ciudadano_residente_us} onChange={handleInputChange} className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-800" />
                  <label htmlFor="ciudadano_residente_us" className="text-sm text-slate-300">¿Ciudadano o Residente US?</label>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="inversionista_institucional" name="inversionista_institucional" checked={form.inversionista_institucional} onChange={handleInputChange} className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-800" />
                  <label htmlFor="inversionista_institucional" className="text-sm text-slate-300">¿Inversionista Institucional?</label>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="accionista_empresa" name="accionista_empresa" checked={form.accionista_empresa} onChange={handleInputChange} className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-800" />
                  <label htmlFor="accionista_empresa" className="text-sm text-slate-300">¿Accionista de empresa?</label>
                </div>
              </div>

              {/* PEP Condicional */}
              <div className="pt-6 border-t border-slate-800">
                <div className="flex items-center gap-3 mb-4">
                  <input type="checkbox" id="es_pep" name="es_pep" checked={form.es_pep} onChange={handleInputChange} className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-800" />
                  <label htmlFor="es_pep" className="text-sm font-semibold text-slate-300">¿Es Persona Expuesta Políticamente (PEP)?</label>
                </div>
                
                {form.es_pep && (
                  <div className="animate-fadeIn">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Institución y Cargo *</label>
                    <input required={form.es_pep} type="text" name="pep_institucion_cargo" value={form.pep_institucion_cargo} onChange={handleInputChange} placeholder="Especifique cargo e institución" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                )}
              </div>

              {/* Vinculación Condicional */}
              <div className="pt-6 border-t border-slate-800">
                <div className="flex items-center gap-3 mb-4">
                  <input type="checkbox" id="es_vinculado_grupo_coril" name="es_vinculado_grupo_coril" checked={form.es_vinculado_grupo_coril} onChange={handleInputChange} className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-800" />
                  <label htmlFor="es_vinculado_grupo_coril" className="text-sm font-semibold text-slate-300">¿Vinculado a grupo económico / Grupo Coril?</label>
                </div>
                
                {form.es_vinculado_grupo_coril && (
                  <div className="animate-fadeIn">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Detalle de Vinculación *</label>
                    <input required={form.es_vinculado_grupo_coril} type="text" name="detalle_vinculacion" value={form.detalle_vinculacion} onChange={handleInputChange} placeholder="Especifique relación o grupo" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                )}
              </div>

              {/* Cónyuge Condicional (si es Casado) */}
              {form.estado_civil === 'Casado' && (
                <div className="pt-6 border-t border-slate-800 space-y-4 animate-fadeIn">
                  <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-2">Información del Cónyuge</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Nombres y Apellidos del Cónyuge *</label>
                      <input required type="text" name="conyuge_nombres_apellidos" value={form.conyuge_nombres_apellidos} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Tipo Doc. Cónyuge *</label>
                      <select name="conyuge_tipo_documento" value={form.conyuge_tipo_documento} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500">
                        <option value="DNI">DNI</option>
                        <option value="CE">Carnet de Extranjería</option>
                        <option value="Pasaporte">Pasaporte</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">N.° Doc. Cónyuge *</label>
                      <input required type="text" name="conyuge_numero_documento" value={form.conyuge_numero_documento} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Email del Cónyuge *</label>
                      <input required type="email" name="conyuge_email" value={form.conyuge_email} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Celular del Cónyuge *</label>
                      <input required type="text" name="conyuge_celular" value={form.conyuge_celular} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="conyuge_separacion_patrimonios" name="conyuge_separacion_patrimonios" checked={form.conyuge_separacion_patrimonios} onChange={handleInputChange} className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-800" />
                      <label htmlFor="conyuge_separacion_patrimonios" className="text-sm text-slate-300">¿Separación de Patrimonios?</label>
                    </div>
                    {!form.conyuge_separacion_patrimonios && (
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Fecha de Matrimonio *</label>
                        <input required type="date" name="conyuge_fecha_matrimonio" value={form.conyuge_fecha_matrimonio} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LABORAL */}
          {activeTab === 'laboral' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Profesión *</label>
                <input required type="text" name="profesion" value={form.profesion} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Ocupación *</label>
                <input required type="text" name="ocupacion" value={form.ocupacion} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Cargo *</label>
                <input required type="text" name="cargo" value={form.cargo} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Empresa / Centro de trabajo *</label>
                <input required type="text" name="empresa_centro_trabajo" value={form.empresa_centro_trabajo} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Actividad Económica *</label>
                <input required type="text" name="actividad_economica" value={form.actividad_economica} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Dirección de la Empresa *</label>
                <input required type="text" name="direccion_empresa" value={form.direccion_empresa} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">País de actividad laboral *</label>
                <input required type="text" name="pais_actividad_laboral" value={form.pais_actividad_laboral} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Tiempo laborando *</label>
                <input required type="text" name="tiempo_laborando" value={form.tiempo_laborando} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
          )}

          {/* TAB 5: FINANCIERO Y BANCO */}
          {activeTab === 'financiero' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Ingreso Anual (USD) *</label>
                  <input required type="number" name="ingreso_anual_usd" value={form.ingreso_anual_usd} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Patrimonio (USD) *</label>
                  <input required type="number" name="patrimonio_usd" value={form.patrimonio_usd} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Liquidez Disponible (USD) *</label>
                  <input required type="number" name="liquidez_disponible_usd" value={form.liquidez_disponible_usd} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Monto inicial a invertir (USD) *</label>
                  <input required type="number" name="monto_inicial_invertir_usd" value={form.monto_inicial_invertir_usd} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Detalle de Origen de Fondos (DJ) *</label>
                  <textarea required name="detalle_origen_fondos" value={form.detalle_origen_fondos} onChange={handleInputChange} rows={3} placeholder="Describa el origen de los fondos (herencias, renta de trabajo, etc.)" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-2">Datos Bancarios</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Banco *</label>
                    <input required type="text" name="banco" value={form.banco} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Tipo de cuenta *</label>
                    <input required type="text" name="tipo_cuenta" value={form.tipo_cuenta} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Moneda *</label>
                    <input required type="text" name="moneda" value={form.moneda} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Número de cuenta *</label>
                    <input required type="text" name="numero_cuenta" value={form.numero_cuenta} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Código SWIFT *</label>
                    <input required type="text" name="codigo_swift" value={form.codigo_swift} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Código de Cuenta Interbancaria (CCI) *</label>
                    <input required type="text" name="cuenta_cci" value={form.cuenta_cci} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: BENEFICIARIOS */}
          {activeTab === 'beneficiarios' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Beneficiarios del Cliente</h3>
                <button
                  type="button"
                  onClick={addBeneficiario}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded border border-emerald-500/20 transition-all"
                >
                  + Agregar Beneficiario
                </button>
              </div>

              <div className="space-y-4">
                {beneficiarios.map((beneficiario, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-950 border border-slate-800 rounded-lg relative animate-fadeIn">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nombre Completo *</label>
                      <input required type="text" value={beneficiario.nombre_completo} onChange={(e) => handleBeneficiarioChange(index, 'nombre_completo', e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Fecha Nacimiento *</label>
                      <input required type="date" value={beneficiario.fecha_nacimiento} onChange={(e) => handleBeneficiarioChange(index, 'fecha_nacimiento', e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Parentesco *</label>
                      <input required type="text" value={beneficiario.parentesco} onChange={(e) => handleBeneficiarioChange(index, 'parentesco', e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-white text-sm" />
                    </div>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Porcentaje (%) *</label>
                        <input required type="number" min="0" max="100" value={beneficiario.porcentaje} onChange={(e) => handleBeneficiarioChange(index, 'porcentaje', e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-white text-sm" />
                      </div>
                      
                      {beneficiarios.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBeneficiario(index)}
                          className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 p-2 rounded transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Indicador de Suma */}
              <div className="flex justify-end items-center mt-4 text-sm font-semibold">
                <span className="text-slate-400 mr-2">Suma Total:</span>
                <span className={getSumaPorcentajes() === 100 ? 'text-emerald-400' : 'text-red-400'}>
                  {getSumaPorcentajes()}%
                </span>
              </div>
            </div>
          )}

          {/* Botones de Enviar y Previsualizar/Descargar Formatos */}
          <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap gap-4 justify-between items-center">
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold px-5 py-3 rounded-lg shadow transition-all duration-300 flex items-center gap-2"
            >
              👁️ Previsualizar Formatos Fiduciarios
            </button>

            <div className="flex gap-4 items-center">
              <button
                type="button"
                onClick={handleGenerarFormatos}
                disabled={downloadingZip}
                className="bg-teal-500 hover:bg-teal-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold px-6 py-3 rounded-lg shadow-lg transition-all duration-300 flex items-center gap-2"
              >
                {downloadingZip ? '⚡ Generando PDFs...' : '📦 Descargar PDFs (.ZIP)'}
              </button>

              <button
                type="submit"
                disabled={saving}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold px-8 py-3 rounded-lg shadow-lg transition-all duration-300"
              >
                {saving ? 'Guardando...' : 'Registrar Ficha Inversionista'}
              </button>
            </div>
          </div>

        </form>

        {/* MODAL DE PREVISUALIZACIÓN DE DOCUMENTOS FIDUCIARIOS */}
        {showPreviewModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
              
              {/* Encabezado del Modal */}
              <div className="p-4 md:p-6 bg-slate-950 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    📄 Previsualización de Formatos Fiduciarios Oficiales
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Verifica los documentos renderizados en tiempo real antes de descargar la suite completa de firma.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleGenerarFormatos}
                    disabled={downloadingZip}
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 text-xs font-bold px-4 py-2 rounded-lg shadow transition-all flex items-center gap-1.5"
                  >
                    {downloadingZip ? '⚡ Generando PDFs...' : '📦 Descargar PDFs (.ZIP)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(false)}
                    className="text-slate-400 hover:text-white p-2 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Selector de Pestañas de los 7 Documentos */}
              <div className="bg-slate-950/60 border-b border-slate-800 px-4 pt-2 flex gap-1 overflow-x-auto scrollbar-none">
                {[
                  { key: 'carta', label: '1. Carta Solicitud' },
                  { key: 'flujos', label: '2. Titularidad Flujos' },
                  { key: 'beneficiarios', label: '3. Beneficiario Final' },
                  { key: 'residencia', label: '4. Residencia Fiscal' },
                  { key: 'ficha-cliente', label: '5. Ficha Cliente (4 Hojas)' },
                  { key: 'instruccion', label: '6. Instrucción Inversión' },
                  { key: 'declaracion', label: '7. Declaración Inversión' },
                ].map((doc) => (
                  <button
                    key={doc.key}
                    type="button"
                    onClick={() => setSelectedDocKey(doc.key)}
                    className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all whitespace-nowrap border-b-2 ${
                      selectedDocKey === doc.key
                        ? 'bg-slate-900 text-emerald-400 border-emerald-400 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 border-transparent'
                    }`}
                  >
                    {doc.label}
                  </button>
                ))}
              </div>

              {/* Visor de Documento mediante iFrame en Vivo */}
              <div className="flex-1 bg-slate-950 p-4 overflow-hidden relative">
                {loadingPreview && (
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-10 text-emerald-400 font-bold text-sm">
                    ⚡ Actualizando vista previa en tiempo real...
                  </div>
                )}
                <iframe
                  srcDoc={previewLiveHtml || '<div style="padding:20px; font-family:sans-serif;">Cargando documento...</div>'}
                  title="Vista Previa en Vivo de Documento Fiduciario"
                  className="w-full h-[70vh] border-0 rounded-xl shadow-inner bg-white"
                />
              </div>

              {/* Pie del Modal */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
                <span>Documento seleccionado: <strong className="text-white uppercase">{selectedDocKey}</strong></span>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-lg transition-all"
                >
                  Cerrar Previsualización
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
