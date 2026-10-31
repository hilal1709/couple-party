# Unduh model glTF dan tekstur CC0 Poly Haven untuk map Petak Cat, sekali saja, ke luar repo.
# Jalankan: python -I scripts/blender/petak_fetch.py
import json
import urllib.request
from pathlib import Path

ROOT = Path('D:/dev/asset-src/polyhaven')
UA = {'User-Agent': 'couple-party-asset-script'}
MODELS = '''exterior_aircon_unit utility_box_01 utility_box_02 plastic_monobloc_chair_01 old_tyre metal_trash_can trashbag
cardboard_box_01 wooden_crate_01 plastic_crate_01 barrel_03 wooden_bucket_01 planter_pot_clay potted_plant_01 wicker_basket_01
watering_can_metal_01 ladder_sectioned_01 water_manhole_cover security_light concrete_road_barrier garden_hose_wall_mounted_01
steel_frame_shelves_01 rollershutter_door fern_02 anthurium_botany_01 plastic_bottle_gallon wooden_stool_01'''.split()
MODELS += '''CashRegister_01 wicker_basket_02 food_apple_01 food_lime_01 food_kiwi_01 food_pomegranate_01 food_avocado_01 bananas lemon
yellow_onion sweet_potato plastic_crate_02 plastic_crate_03 wooden_crate_02 Lantern_01 boombox Ukulele_01 rubber_duck_toy small_lpg_tank
portable_generator wooden_barrels_01 caged_hanging_light outdoor_table_chair_set_01 wooden_stool_02 CoffeeCart_01'''.split()  # pasar
MODELS += '''marble_bust_01 horse_statue_01 gothic_statue bronze_whale_statue bronze_shark_statue bronze_ray_statue concrete_cat_statue lion_head
bull_head horse_head Chandelier_01 Chandelier_03 fancy_picture_frame_01 fancy_picture_frame_02 ceramic_vase_01 ceramic_vase_02 ceramic_vase_03
antique_ceramic_vase_01 brass_vase_01 carved_wooden_elephant katana_stand_01 treasure_chest vintage_grandfather_clock_01 ArmChair_01 Sofa_01
Ottoman_01 security_camera_01 fire_alarm korean_fire_extinguisher_01 WetFloorSign_01 ornate_mirror_01 kite_shield mantel_clock_01'''.split()  # museum
MODELS += '''modular_street_seating street_lamp_02 mounted_fluorescent_lights korean_public_payphone_01 vintage_suitcase wall_clock
security_camera_02 hand_truck old_military_crate fire_hydrant concrete_road_barrier_02 modular_chainlink_fence painted_wooden_bench
covered_car rusted_wheel_rim_01 modular_electricity_poles'''.split()  # stasiun
MODELS += '''modular_industrial_pipes_01 modular_airduct_circular_01 modular_airduct_rectangular_01 overhead_crane industrial_storage_cart
Barrel_01 Barrel_02 propane_tank power_box_01 tool_cart metal_tool_chest drill_press_01 hanging_industrial_lamp industrial_pastic_container
plastic_jerrycan metal_jerrycan worn_metal_rack steel_frame_shelves_02 old_military_compressor modular_factory_facade'''.split()  # pabrik
MODELS += '''electric_stove vintage_microwave vintage_electric_kettle wooden_cutting_board wooden_spoon brass_pot_01 brass_pan_01 pot_enamel_01
jug_01 wooden_bowl_01 tea_set_01 hamburger_buns croissant carrot_cake strawberry_chocolate_cake russian_food_cans_01 long_life_food
wine_bottles_01 all_purpose_cleaner bleach_bottle CheeseBox_01 plastic_thermos dustpan plastic_broom'''.split()  # dapur
MODELS += '''street_lamp_01 modular_fire_escape modular_urban_apartments_facade rollershutter_window_01 modular_metal_gutter'''.split()  # kota
MODELS += '''cannon_01 wine_barrel_01 wooden_bucket_02 wooden_lantern_01 lifebuoy ocean_buoy seadogs_compass modular_wooden_pier
dutch_ship_medium ship_pinnace'''.split()  # kapal
# tekstur permukaan utama: warna, normal, dan roughness 2K
TEX2K = '''rectangular_paving concrete_wall_008 brick_4 clay_roof_tiles dirt_floor dirty_concrete plywood distressed_painted_planks
weathered_planks rusty_corrugated_iron corrugated_iron_02 old_wood_floor leather_red_02 marble_01 herringbone_parquet large_floor_tiles_02
cobblestone_01 gravel concrete_tiles worn_tile_floor worn_mossy_plasterwall blue_painted_planks brown_leather painted_worn_brick terrazzo_tiles
asphalt_02 brown_planks_05'''.split()


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA)).read()


def save(url, dest):
    if dest.exists():
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(get(url))


for pid in MODELS:
    entry = json.loads(get(f'https://api.polyhaven.com/files/{pid}'))['gltf']['1k']['gltf']
    base = ROOT / 'models' / pid
    save(entry['url'], base / f'{pid}.gltf')
    for rel, f in entry['include'].items():
        save(f['url'], base / rel)
    print('model', pid, flush=True)

for pid in TEX2K:
    files = json.loads(get(f'https://api.polyhaven.com/files/{pid}'))
    for key, kind in (('Diffuse', 'diff'), ('nor_gl', 'nor'), ('Rough', 'rough')):
        entry = files.get(key)
        if entry:
            save(entry['2k']['jpg']['url'], ROOT / 'tex2k' / f'{pid}_{kind}.jpg')
    print('tekstur', pid, flush=True)
print('SELESAI')
