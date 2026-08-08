import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardPaste } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { parseMlCallbackParams } from '../lib/callback-params';

/**
 * Segundo paso de la vinculación manual: el usuario pega la URL de redirección
 * y lo mandamos al callback con los parámetros ya parseados.
 */
export function MlManualCallbackForm() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = parseMlCallbackParams(value);

    if (!result.ok) {
      setError(result.reason);
      return;
    }

    setError(null);
    const query = new URLSearchParams({
      code: result.params.code,
      state: result.params.state,
    }).toString();
    navigate(`/connecting-ml?${query}`, { replace: true });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 text-left">
      <div className="space-y-1.5">
        <Label htmlFor="ml-callback-url">URL de redirección</Label>
        <Textarea
          id="ml-callback-url"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          placeholder="https://local/?code=TG-123abc...&state=9f8e7d..."
          className="min-h-20 font-mono text-xs"
          aria-invalid={error ? true : undefined}
        />
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Sirve la URL entera o sólo el{' '}
            <span className="font-mono">?code=...&amp;state=...</span>
          </p>
        )}
      </div>

      <Button type="submit" variant="outline" className="w-fit">
        <ClipboardPaste />
        Continuar la vinculación
      </Button>
    </form>
  );
}
