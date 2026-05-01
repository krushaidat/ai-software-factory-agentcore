import { OutputsView } from '../../components/outputs/OutputsView';

/** Wraps the existing OutputsView so it can plug into the workspace tab system. */
export function ReportsView() {
  return <OutputsView />;
}
