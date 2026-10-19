import FormVehicule from './FormVehicule';
import ListVehicule from './ListVehicule';

function Vehicule() {
    return (
        <div>
            <h2 className="text-xl font-bold">Contrôle des véhicules</h2>
            <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
                <FormVehicule />
                <ListVehicule />
            </div>
        </div>
    );
}

export default Vehicule;