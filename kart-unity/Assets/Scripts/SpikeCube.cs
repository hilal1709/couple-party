using UnityEngine;

/// <summary>Adegan uji penyematan: kubus berputar, tombol keluar mengembalikan hasil ke app.</summary>
public class SpikeCube : MonoBehaviour
{
    void Update() => transform.Rotate(30f * Time.deltaTime, 60f * Time.deltaTime, 0f);

    void OnGUI()
    {
        var style = new GUIStyle(GUI.skin.button) { fontSize = Screen.height / 16 };
        var box = new Rect(Screen.width * .35f, Screen.height * .78f, Screen.width * .3f, Screen.height * .16f);
        if (GUI.Button(box, "Selesai", style)) KartBridge.Finish("{\"spike\":true}");
    }
}
