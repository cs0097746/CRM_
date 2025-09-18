import { useState } from "react";
import axios from "axios";
import type { AtributoPersonalizavel} from "../../types/AtributoPersonalizavel.ts";

export function AtributosNegocioModal({ negocioId, token, onSaved }: { negocioId: number; token: string; onSaved: () => void }) {
  const [atributos, setAtributos] = useState<AtributoPersonalizavel[]>([]);
  const [novoLabel, setNovoLabel] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [novoType, setNovoType] = useState("");

  const adicionarAtributo = () => {
    if (!novoLabel.trim()) return;
    setAtributos([...atributos, { label: novoLabel, valor: novoValor, type: novoType }]);
    setNovoLabel("");
    setNovoValor("");
    setNovoType("");
  };

  const salvar = async () => {
    try {
      await axios.patch(`/negocios/${negocioId}/`, { atributos_personalizados: atributos }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSaved();
    } catch (err) {
      console.error("Erro ao salvar atributos:", err);
    }
  };

  return (
    <>
      <button className="btn btn-outline-dark btn-sm" data-bs-toggle="modal" data-bs-target={`#modalAtributos${negocioId}`}>
        ⚙ Campos
      </button>

      <div className="modal fade" id={`modalAtributos${negocioId}`} tabIndex={-1}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Campos Personalizados</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">
              {atributos.map((attr, i) => (
                <div key={i} className="border rounded p-2 mb-2">
                  <strong>{attr.label}:</strong> {attr.valor}
                </div>
              ))}

              <input className="form-control mb-2" placeholder="Nome do campo" value={novoLabel} onChange={(e) => setNovoLabel(e.target.value)} />
              <input className="form-control mb-2" placeholder="Valor" value={novoValor} onChange={(e) => setNovoValor(e.target.value)} />
              <input className="form-control mb-2" placeholder="Tipo do Campo"  value={novoType} onChange={(e) => setNovoType(e.target.value)} />
              <button className="btn btn-sm btn-primary" onClick={adicionarAtributo}>Adicionar</button>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
              <button className="btn btn-dark" onClick={salvar} data-bs-dismiss="modal">Salvar</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
