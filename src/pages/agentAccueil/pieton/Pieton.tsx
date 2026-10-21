import FormPieton from './FormPieton';
import ListPieton from './ListPieton';

function Pieton() {
    return (
        <div>
            <h2>Contrôle des passages</h2>
            <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
                <FormPieton />
                <ListPieton />
            </div>
        </div>
    );
}

export default Pieton;
