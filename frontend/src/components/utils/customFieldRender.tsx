import { Form } from 'react-bootstrap';
import { FileAttributePreview} from "./fileRender.tsx";

export const renderValueInput = (currentType: string, value: string | File, onChange: (value: string | File) => void) => {
  const inputStyle = { borderRadius: "0.6rem", borderColor: "#d0d0d0", padding: "0.5rem" };

  switch (currentType) {
    case 'boolean':
      return (
        <Form.Select value={typeof value === 'string' ? value : String(value)} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
          <option value="false">Não</option>
          <option value="true">Sim</option>
        </Form.Select>
      );
    case 'integer':
    case 'float':
      return (
        <Form.Control
          type="number"
          step={currentType === 'integer' ? '1' : '0.01'}
          placeholder={currentType === 'integer' ? "Ex: 42" : "Ex: 3.14"}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
        />
      );
    case 'date':
      return <Form.Control type="date" value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} style={inputStyle} />;
    case 'datetime':
      return <Form.Control type="datetime-local" value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} style={inputStyle} />;
    case 'time':
      return <Form.Control type="time" value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} style={inputStyle} />;
    case 'text':
      return (
        <Form.Control
          as="textarea"
          rows={3}
          placeholder="Digite o valor do campo (texto longo)"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
        />
      );
    case 'file':
      return (
        <Form.Control
          type="file"
          onChange={(e) => {
            const target = e.target as HTMLInputElement;
            onChange(target.files?.[0] || "");
          }}
          style={inputStyle}
        />
      );
    case 'string':
    default:
      return (
        <Form.Control
          type="text"
          placeholder="Digite o valor do campo"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
        />
      );
  }
};

export const renderCustomAttributeValue = (atributo: any) => {
  const { type, valor } = atributo;
  const inputStyle = { marginBottom: "0.5rem" };

  switch (type) {
    case "boolean":
      const isTrue = atributo.valor_formatado === true;
      return (
        <div className="d-flex gap-3 mt-1">
          <Form.Check type="checkbox" id={`sim-${atributo.id}`} label="Sim" checked={isTrue} readOnly />
          <Form.Check type="checkbox" id={`nao-${atributo.id}`} label="Não" checked={!isTrue} readOnly />
        </div>
      );
    case "file":
      return <FileAttributePreview atributo={atributo} />;
    case "integer":
    case "float":
      return <Form.Control type="number" value={valor} readOnly style={inputStyle} />;
    case "date":
      return <Form.Control type="text" value={valor ? new Date(valor).toLocaleDateString("pt-BR") : ""} readOnly style={inputStyle} />;
    case "datetime":
      return <Form.Control type="text" value={valor ? new Date(valor).toLocaleString("pt-BR", { hour12: false }) : ""} readOnly style={inputStyle} />;
    case "time":
      return <Form.Control type="text" value={valor ? new Date(`1970-01-01T${valor}`).toLocaleTimeString("pt-BR", { hour12: false, hour: '2-digit', minute: '2-digit' }) : ""} readOnly style={inputStyle} />;
    case "text":
    case "string":
    default:
      return <Form.Control as="textarea" rows={3} value={valor || ""} readOnly style={inputStyle} />;
  }
};